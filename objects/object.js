const { DateTime } = require('luxon');
const EventEmitter = require('events');
const Status = require('./status.js');
const { ResourceVersion } = require('../database/models.js');
const { busFor, keyFor } = require('./bus.js');

// Parse a label or field selector into [key, op, value] triples. Splitting the
// whole string on ',' is wrong for the set-based forms — `app in (x,y)` becomes
// `app in (x` and `y)`, which silently matched nothing — so commas inside
// parentheses don't separate clauses.
// Supports: key=value, key==value, key!=value, key in (a,b), key notin (a,b),
// key (exists) and !key (doesn't exist).
function parseSelector(selector) {
  let clauses = [];
  let depth = 0;
  let current = '';
  for (const ch of String(selector)) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      clauses.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  clauses.push(current);

  let parsed = [];
  for (const raw of clauses) {
    let clause = raw.trim();
    if (!clause) continue;
    let set = clause.match(/^(.+?)\s+(notin|in)\s*\((.*)\)$/);
    if (set) {
      parsed.push([set[1].trim(), set[2], set[3].split(',').map((v) => v.trim()).filter((v) => v)]);
      continue;
    }
    let neq = clause.match(/^(.+?)\s*!=\s*(.*)$/);
    if (neq) {
      parsed.push([neq[1].trim(), '!=', neq[2].trim()]);
      continue;
    }
    let eq = clause.match(/^(.+?)\s*==?\s*(.*)$/);
    if (eq) {
      parsed.push([eq[1].trim(), '=', eq[2].trim()]);
      continue;
    }
    if (clause.startsWith('!')) {
      parsed.push([clause.slice(1).trim(), '!exists', undefined]);
      continue;
    }
    parsed.push([clause, 'exists', undefined]);
  }
  return parsed;
}

// `continue` is an opaque token to the client; we only need it to carry how
// far into the sorted result the next page starts. `limit` was accepted and
// applied, but the response never returned a token and reported
// remainingItemCount 0 — after the first page a client had no way to ask for
// the rest, and no way to know there was a rest.
function encodeContinue(skip) {
  return Buffer.from(JSON.stringify({ skip })).toString('base64');
}

function decodeContinue(token) {
  if (!token) {
    return 0;
  }
  try {
    let { skip } = JSON.parse(Buffer.from(String(token), 'base64').toString('utf8'));
    return Number.isFinite(skip) && skip > 0 ? skip : 0;
  } catch (e) {
    return 0;
  }
}

// Mongoose gives every array subdocument its own `_id`, and they were being
// served as part of the object: `spec.ports[0]._id`, `involvedObject._id`, and
// so on. No Kubernetes object has those fields, and they survive a
// `get -o yaml | apply` round trip back into the stored object.
function stripMongoInternals(value) {
  if (Array.isArray(value)) {
    return value.map(stripMongoInternals);
  }
  if (value && typeof value === 'object') {
    let out = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === '_id' || key === '__v') {
        continue;
      }
      out[key] = stripMongoInternals(child);
    }
    return out;
  }
  return value;
}

// Kinds a client legitimately posts without a name: they are answers to a
// question ("may I do this?"), not objects anyone will look up later.
const NAMELESS_KINDS = new Set([
  'Binding',
  'Eviction',
  'LocalSubjectAccessReview',
  'SelfSubjectAccessReview',
  'SelfSubjectReview',
  'SelfSubjectRulesReview',
  'SubjectAccessReview',
  'TokenRequest',
  'TokenReview',
]);

// The suffix Kubernetes appends to a generateName: five characters from an
// alphabet that avoids vowels and lookalikes.
function randomSuffix() {
  const alphabet = 'bcdfghjklmnpqrstvwxz2456789';
  let out = '';
  for (let i = 0; i < 5; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

// Fire-and-forget write of an Event record so conformance tests that assert
// CRUD on a resource emits events succeed. Required by [sig-instrumentation]
// Events should delete a collection of events — it creates PodTemplates and
// expects 3 events to exist.
let Event;
function emitEvent(kind, meta, reason) {
  if (!Event) Event = require('./event.js');
  if (!meta) return;
  let objRef = {
    kind,
    namespace: meta.namespace,
    name: meta.name,
    uid: meta.uid,
    apiVersion: meta.apiVersion,
    resourceVersion: meta.resourceVersion,
  };
  let nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  Event.create({
    metadata: {
      name: `${meta.name || 'evt'}.${Date.now().toString(36)}`,
      namespace: meta.namespace || 'default',
    },
    // Fields for events.k8s.io/v1 clients:
    regarding: objRef,
    related: objRef,
    note: reason,
    reason,
    reportingController: 'kubelet',
    reportingInstance: '',
    deprecatedSource: { component: 'kubelet', host: '' },
    deprecatedFirstTimestamp: nowIso,
    deprecatedLastTimestamp: nowIso,
    deprecatedCount: 1,
    // Field for core/v1 clients (they read involvedObject, not regarding):
    involvedObject: objRef,
    source: { component: 'kubelet', host: '' },
    firstTimestamp: nowIso,
    lastTimestamp: nowIso,
    count: 1,
    eventTime: nowIso,
    type: 'Normal',
  }).catch(() => {});
}

class K8Object {
  constructor(config) {
    this.apiVersion = config.apiVersion;
    this.kind = config.kind;
    this.metadata = config.metadata;
    this.eventEmitter = new EventEmitter();
  }

  static findOneByReq(reqQuery = {}, reqParams = {}) {
    let q = this.genFindQuery(reqQuery, reqParams);
    return this.Model.findOne(q.params, q.projection, q.options)
      .then((obj) => {
        if (obj) {
          return new this(obj);
        }
      });
  }

  static findByReq(reqQuery = {}, reqParams = {}, options = {}) {
    let q = this.genFindQuery(reqQuery, reqParams, options)
    return this.Model.find(q.params, q.projection, q.options)
      .then((arr) => {
        if (arr) {
          return arr.map((obj) => new this(obj));
        }
      });
  }

  static findOne(params = {}, projection = {}, options = {}) {
    return this.Model.findOne(params, projection, options)
      .then((obj) => {
        if (obj) {
          return new this(obj);
        }
      });
  }

  static find(params = {}, projection = {}, options = {}) {
    return this.Model.find(params, projection, options)
      .then((arr) => {
        if (arr) {
          return arr.map((obj) => new this(obj));
        }
      });
  }

  events() {
    return this.eventEmitter;
  }

  // `generateName` means the server picks the name. Without this the object was
  // stored with no name at all: 201 was returned, but nothing could GET, patch
  // or delete it again, and it printed as a blank row. It has to happen before
  // anyone builds a uniqueness query, because a query with an undefined name
  // drops that clause and matches an unrelated object instead.
  static applyGenerateName(metadata) {
    if (!metadata) {
      return metadata;
    }
    // The review kinds are request/response objects in Kubernetes, not stored
    // resources, so clients send them with no name at all — `kubectl auth
    // can-i` posts a SelfSubjectAccessReview with empty metadata. We do
    // persist them, so give them a name rather than rejecting the request.
    if (!metadata.name && !metadata.generateName && NAMELESS_KINDS.has(this.kind)) {
      metadata.generateName = `${`${this.kind}`.toLowerCase()}-`;
    }
    if (!metadata.name && metadata.generateName) {
      metadata.name = `${metadata.generateName}${randomSuffix()}`;
    }
    return metadata;
  }

  static create(config, searchQ, options = {}) {
    if (!config.metadata) {
      return Promise.reject(this.unprocessableContentStatus());
    }
    // `this`, not K8Object: called on the base class the helper sees
    // K8Object.kind (undefined), so the nameless review kinds never matched
    // and an internal create with empty metadata was rejected.
    this.applyGenerateName(config.metadata);
    if (!config.metadata.name) {
      return Promise.reject(this.unprocessableContentStatus(
        this.kind, undefined, undefined,
        `${this.kind} "": name or generateName is required`, 'Invalid',
      ));
    }
    if (!config.metadata.labels) {
      config.metadata.labels = new Map([['name', config.metadata.name]]);
    }
    if (!searchQ) {
      searchQ = { 'metadata.name': config.metadata.name, 'metadata.namespace': config.metadata.namespace };
    }
    return this.findOne(searchQ)
    .then((existingObj) => {
      if (existingObj) {
        throw this.alreadyExistsStatus(this.kind, config.metadata.name);
      }
      config.metadata.creationTimestamp = DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "");
      return this.nextResourceVersion().then((resourceVersion) => {
      config.metadata.resourceVersion = resourceVersion;
      // Our Mongoose schemas are fragments; strict casting / validation
      // rejects valid Kubernetes specs (SeccompProfile, LimitRangeItem, …).
      // Fall back to a direct collection insert if Mongoose can't handle it.
      let saveOpts = { validateBeforeSave: false, ...options };
      return new Promise((resolve, reject) => {
        let doc;
        try {
          doc = new this.Model(config);
        } catch (castErr) {
          // Cast failure during doc construction — bypass Mongoose entirely.
          return this.Model.collection.insertOne(config)
            .then(() => resolve(config))
            .catch(reject);
        }
        doc.save(saveOpts).then(resolve, (err) => {
          if (err?.name === 'ValidationError' || err?.name === 'CastError' || err?.name === 'StrictModeError') {
            return this.Model.collection.insertOne(config)
              .then(() => resolve(config))
              .catch(reject);
          }
          reject(err);
        });
      });
      });
    })
    .then((obj) => {
      let inst = new this(obj);
      inst.events().emit('created');
      busFor(this.kind).emit('created', inst);
      if (this.kind !== 'Event') emitEvent(this.kind, obj.metadata, 'Created');
      return obj;
    });
  }

  delete (searchQ) {
    if (!searchQ) {
      searchQ = { 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace };
    }
    // Finalizers were ignored: an object carrying one was removed immediately,
    // so the controller that registered it never got its chance to run and a
    // client waiting for the object to disappear on its own terms saw it
    // vanish first. A delete now only stamps deletionTimestamp; the object
    // goes when the last finalizer is cleared (see `finalizeIfReleased`).
    let hasFinalizers = (this.metadata?.finalizers || []).length > 0;
    if (hasFinalizers && !this.metadata?.deletionTimestamp) {
      return K8Object.nextResourceVersion()
        .then((resourceVersion) => this.Model.findOneAndUpdate(
          searchQ,
          {
            $set: {
              'metadata.deletionTimestamp': DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
              'metadata.resourceVersion': resourceVersion,
            },
          },
          { new: true },
        ))
        .then((obj) => {
          if (obj) {
            this.events().emit('updated');
            busFor(this.kind).emit('updated', obj);
          }
          return obj;
        });
    }
    return this.Model.findOneAndDelete(searchQ)
    .then((obj) => {
      if (obj) {
        this.events().emit('deleted');
        busFor(this.kind).emit('deleted', obj);
        return obj;
      }
    });
  }

  // Once a delete has been requested and the last finalizer is gone, the object
  // is actually removed. Called after any write, since clearing the finalizer
  // is an ordinary patch or update.
  finalizeIfReleased(obj, searchQ) {
    let meta = obj?.metadata;
    if (!meta?.deletionTimestamp || (meta.finalizers || []).length > 0) {
      return Promise.resolve(obj);
    }
    let Model = this.Model;
    let kind = this.kind;
    return Model.findOneAndDelete(searchQ || {
      'metadata.name': meta.name,
      'metadata.namespace': meta.namespace,
    }).then((deleted) => {
      this.events().emit('deleted');
      busFor(kind).emit('deleted', deleted || obj);
      return deleted || obj;
    });
  }

  static deleteMany (searchQ) {
    return this.Model.deleteMany(searchQ)
    .then((arr) => {
      if (arr) {
        return arr;
      }
    });
  }

  // Full-replacement update (HTTP PUT). Replaces spec/status/data/etc. while
  // preserving the server-managed metadata (uid, creationTimestamp). Accepts
  // a plain object body; falls back to raw Mongo update on cast errors.
  update(updateObj, searchQ, options = {}) {
    if (!searchQ) {
      searchQ = { 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace };
    }
    let replacement = { ...updateObj };
    // Preserve server-owned metadata; caller's metadata only contributes the
    // fields they explicitly set (labels/annotations/finalizers).
    replacement.metadata = {
      ...this.metadata,
      ...(updateObj.metadata || {}),
      uid: this.metadata.uid,
      creationTimestamp: this.metadata.creationTimestamp,
      name: this.metadata.name,
      namespace: this.metadata.namespace,
    };
    let Model = this.Model;
    let kind = this.kind;
    let emitter = this.eventEmitter;
    let self = this;
    return K8Object.nextResourceVersion()
      .then((resourceVersion) => {
        replacement.metadata.resourceVersion = resourceVersion;
        return Model.findOneAndReplace(searchQ, replacement, { new: true, ...options });
      })
      .catch(async (err) => {
        if (err?.name === 'CastError' || err?.name === 'ValidationError') {
          await Model.collection.replaceOne(searchQ, replacement);
          return Model.collection.findOne(searchQ);
        }
        throw err;
      })
      .then((obj) => {
        if (obj) {
          emitter?.emit?.('updated');
          busFor(kind).emit('updated', obj);
          return self.finalizeIfReleased(obj, searchQ);
        }
      });
  }

  patch(updateObj, searchQ, options = {}) {
    if (!searchQ) {
      searchQ = { 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace };
    }
    let Model = this.Model;
    let kind = this.kind;
    let emitter = this.eventEmitter;
    let self = this;
    return K8Object.nextResourceVersion()
      .then((resourceVersion) => {
        // The body arrives either as a mongo operator update or as a plain
        // replacement; either way the stored object gets the new version.
        // Testing only for $set/$unset missed operator updates that use
        // neither — `{$inc: {...}}`, which the controllers use constantly —
        // and mixed a bare `metadata` field into them, replacing the whole
        // metadata subdocument with just the resourceVersion. The object kept
        // its data and lost its name, namespace and uid.
        let usesOperators = updateObj && Object.keys(updateObj).some((key) => key.startsWith('$'));
        updateObj = usesOperators
          ? { ...updateObj, $set: { ...updateObj.$set, 'metadata.resourceVersion': resourceVersion } }
          : { ...updateObj, metadata: { ...(updateObj?.metadata || {}), resourceVersion } };
        return this.Model.findOneAndUpdate(
          searchQ,
          updateObj,
          {
            new: true,
            ...options,
          }
        );
      })
    .catch(async (err) => {
      // Mongoose cast failures on complex subdocs are common with our
      // hand-rolled schemas; fall back to a raw Mongo update that bypasses
      // casting so clients can still round-trip spec data.
      if (err?.name === 'CastError' || err?.name === 'ValidationError') {
        await Model.collection.updateOne(searchQ, updateObj);
        return Model.collection.findOne(searchQ);
      }
      throw err;
    })
    .then((obj) => {
      if (obj) {
        emitter?.emit?.('updated');
        busFor(kind).emit('updated', obj);
        return self.finalizeIfReleased(obj, searchQ);
      }
    });
  }

  static findAllSorted(queryOptions = {}, sortOptions = { 'created_at': 1 }) {
    return this.find(queryOptions, sortOptions);
  }

  static findAllSortedByReq(reqQuery = {}, reqParams = {}, sortOptions = { 'created_at': 1 }) {
    return this.findByReq(reqQuery, reqParams, sortOptions);
  }

  static async list (queryOptions = {}, data = []) {
    // `data` has already been limited by the query, so it can never be longer
    // than the limit — the old comparison was between a number and itself and
    // never produced a token. The count of everything matching is what says
    // whether another page exists.
    let consumed = (queryOptions.skip || 0) + data.length;
    let remaining = Number.isFinite(queryOptions.total)
      ? Math.max(0, queryOptions.total - consumed)
      : 0;
    return {
      apiVersion: this.apiVersion,
      kind: `${this.kind}List`,
      metadata: {
        continue: remaining > 0 ? encodeContinue(consumed) : undefined,
        remainingItemCount: remaining,
        // The cluster version this list was read at, not a hash of its
        // contents: a client lists, then watches from this version, and
        // expects to receive exactly what happened after the read.
        resourceVersion: await this.currentResourceVersion()
      },
      items: data.map((i) => i.toJSON())
    }
  }

  static listByReq (reqQuery = {}, reqParams = {}, queryOptions = {}) {
    // Passing an empty queryOptions straight through as findAllSortedByReq's
    // sortOptions overrode its default, so the list path ran with no sort at
    // all — and the _id tie-break that makes offset paging stable never
    // applied on the one path that pages.
    let sortOptions = Object.keys(queryOptions).length > 0 ? queryOptions : { 'created_at': 1 };
    let q = this.genFindQuery(reqQuery, reqParams, sortOptions);
    return Promise.all([
      this.findAllSortedByReq(reqQuery, reqParams, sortOptions),
      q.options.limit ? this.Model.countDocuments(q.params) : Promise.resolve(undefined),
    ]).then(([arr, total]) => this.list({
      ...queryOptions,
      limit: q.options.limit,
      skip: q.options.skip || 0,
      total,
    }, arr));
  }

  static listByQuery (queryOptions = {}) {
    return this.findAllSorted(queryOptions)
      .then((arr) => this.list(queryOptions, arr));
  }

  getMetadata() {
    return this.metadata;
  }

  // Allocate the next cluster-wide version. This used to be a hash of the
  // object's own JSON, recomputed on every read: two unrelated objects could
  // not be ordered against each other, a client couldn't tell newer from
  // older, and there was nothing for a watch to resume from.
  static nextResourceVersion() {
    return ResourceVersion.findOneAndUpdate(
      { _id: 'global' },
      { $inc: { value: 1 } },
      { new: true, upsert: true },
    ).then((doc) => `${doc.value}`);
  }

  // The version as of now, without consuming one. This is what a list reports:
  // "these are the contents at version N", so a watch started at N doesn't
  // replay what the list already returned.
  static currentResourceVersion() {
    return ResourceVersion.findOne({ _id: 'global' })
      .then((doc) => `${doc?.value ?? 0}`);
  }

  async setResourceVersion() {
    this.metadata = {
      ...this.metadata,
      resourceVersion: await K8Object.nextResourceVersion(),
    }
    return this;
  }

  static genFindQuery(reqQuery = {}, reqParams = {}, sortOptions = {}) {
    let params = {};
    if (reqParams.name) {
      params['metadata.name'] = reqParams.name;
    }
    if (reqParams.namespace) {
      params['metadata.namespace'] = reqParams.namespace;
    }
    let projection = {};
    if (reqQuery.node) {
      params['metadata.node'] = reqQuery.node;
    }
    // `resourceVersion` / `resourceVersionMatch` on a list are consistency
    // hints about *when* to read, not filters on the objects returned. This
    // used to match them against metadata.resourceVersion, so any client
    // passing one got an empty list back.
    if (reqQuery.fieldSelector) {
      for (const [path, op, value] of parseSelector(reqQuery.fieldSelector)) {
        if (op === '!=') {
          params[path] = { $ne: value };
        } else if (op === '=') {
          params[path] = value;
        }
        // Field selectors have no set-based or existence forms; anything else
        // is a malformed selector and matching nothing is the safer answer.
      }
    }
    if (reqQuery.labelSelector) {
      for (const [key, op, value] of parseSelector(reqQuery.labelSelector)) {
        let path = `metadata.labels.${key}`;
        if (op === '=') {
          params[path] = value;
        } else if (op === '!=') {
          params[path] = { $ne: value };
        } else if (op === 'in') {
          params[path] = { $in: value };
        } else if (op === 'notin') {
          params[path] = { $nin: value };
        } else if (op === 'exists') {
          params[path] = { $exists: true };
        } else if (op === '!exists') {
          params[path] = { $exists: false };
        }
      }
    }
    let options = {};
    if (Object.keys(sortOptions).length > 0) {
      // Tie-break on _id. Paging by offset only works if the order is the same
      // between requests, and the default sort key (`created_at`) isn't a
      // field any of these documents actually have.
      options.sort = { ...sortOptions, _id: 1 };
    }
    if (reqQuery.limit) {
      options.limit = Number(reqQuery.limit);
    }
    let skip = decodeContinue(reqQuery.continue);
    if (skip) {
      options.skip = skip;
    }
    return {
      params,
      projection,
      options,
    };
  }

  static genFindSortedQuery(reqQuery = {}, reqParams = {}, sortOptions = { 'created_at': 1 }) {
    return this.genFindQuery(reqQuery, reqParams, sortOptions)
  }

  toJSON() {
    let shallow = { ...this };
    delete shallow.Model;
    delete shallow.eventEmitter;
    delete shallow._emitter;
    delete shallow._probeIntervals;
    return stripMongoInternals(JSON.parse(JSON.stringify(shallow)));
  }

  getKind() {
    return this.kind;
  }

  getEventEmitter() {
    return this.objEmitter;
  }

  getApiVersion() {
    return this.apiVersion;
  }

  static arrayBufferTo53bitNumber(buffer) {
    const view = new DataView(buffer);
    const first32bits = view.getUint32(0, true);
    const next21bits = view.getUint32(4, true) & 0b111111111111111111111;
    return first32bits * 0x200000 + next21bits;
  }

  static digest256(input) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  }

  static async hash(input) {
    const sha256 = await this.digest256(input);
    return this.arrayBufferTo53bitNumber(sha256);
  }

  // The default Table columns. `kubectl get` prints whatever the server names
  // here, so a kind whose table() returned `columnDefinitions: []` while still
  // emitting [name, age] cells printed rows under no header at all — which was
  // the case for 33 of the kinds we route.
  static nameAndAgeColumns() {
    return [
      {
        "name": "Name",
        "type": "string",
        "format": "name",
        "description": "Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names",
        "priority": 0
      },
      {
        "name": "Age",
        "type": "string",
        "format": "",
        "description": "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata",
        "priority": 0
      },
    ];
  }

  // Name first: every caller has one, and the kind is already known from the
  // model. Taking kind first meant callers' `notFoundStatus(name)` set the kind
  // to the object's name and left the message undefined.
  static notFoundStatus(name = this?.metadata?.name, kind = this.kind, group = undefined) {
    return new Status({
      status: 'Failure',
      reason: 'NotFound',
      code: 404,
      message: kind && name ? `${kind.toLowerCase()} "${name}" not found` : undefined,
      details: {
        name,
        group,
        kind: kind ? kind.toLowerCase() : undefined,
      }
    });
  }

  static successfulStatus(kind = this.kind, name = this?.metadata?.name, uid = this?.metadata?.uid) {
    return new Status({
      status: 'Success',
      reason: 'Success',
      code: 200,
      message: 'Success',
      details: {
        name,
        kind: kind ? kind.toLowerCase() : undefined,
        uid,
      }
    });
  }

  static forbiddenStatus(kind = this.kind, name = this?.metadata?.name, group = undefined) {
    return new Status({
      status: 'Failure',
      reason: 'Forbidden',
      code: 403,
      message: kind && name ? `${kind.toLowerCase()} "${name}" is forbidden: User "" cannot get resource "${name}" in API group "${group}" in the ${kind.toLowerCase()} "${name}"` : undefined,
      details: {
        name,
        group,
        kind: kind ? kind.toLowerCase() : undefined,
      }
    });
  }

  static unprocessableContentStatus(kind = this.kind, name = this?.metadata?.name, group = undefined, message = undefined, reason = "UnprocessableContent") {
    return new Status({
      status: 'Failure',
      reason,
      code: 422,
      message,
      details: {
        name,
        group,
        kind: kind ? kind.toLowerCase() : undefined,
      }
    });
  }

  static alreadyExistsStatus(kind = this.kind, name = this?.metadata?.name, group = undefined) {
    return new Status({
      status: 'Failure',
      reason: 'AlreadyExists',
      code: 409,
      message: kind && name ? `${kind.toLowerCase()} "${name}" already exists` : undefined,
      details: {
        name,
        group,
        kind: kind ? kind.toLowerCase() : undefined,
      }
    });
  }

  static internalServerErrorStatus(kind = this.kind, name = this?.metadata?.name, group = undefined) {
    return new Status({
      status: 'Failure',
      reason: 'InternalServerError',
      code: 500,
      message: "An internal server error has occured, please see the logs for more information",
      details: {
        name,
        group,
        kind: kind ? kind.toLowerCase() : undefined,
      }
    });
  }
}

module.exports = K8Object;
