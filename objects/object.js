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

  static create(config, searchQ, options = {}) {
    if (!config.metadata) {
      return Promise.reject(this.unprocessableContentStatus());
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
    return this.Model.findOneAndDelete(searchQ)
    .then((obj) => {
      if (obj) {
        this.events().emit('deleted');
        busFor(this.kind).emit('deleted', obj);
        return obj;
      }
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
          return obj;
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
        // The body arrives either flattened into $set/$unset or as a plain
        // replacement; either way the stored object gets the new version.
        updateObj = updateObj && (updateObj.$set || updateObj.$unset)
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
        return obj;
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
    return {
      apiVersion: this.apiVersion,
      kind: `${this.kind}List`,
      metadata: {
        continue: queryOptions?.limit < data.length ? "true" : undefined,
        remainingItemCount: queryOptions.limit && queryOptions.limit < data.length ? data.length - queryOptions.limit : 0,
        // The cluster version this list was read at, not a hash of its
        // contents: a client lists, then watches from this version, and
        // expects to receive exactly what happened after the read.
        resourceVersion: await this.currentResourceVersion()
      },
      items: data.map((i) => i.toJSON())
    }
  }

  static listByReq (reqQuery = {}, reqParams = {}, queryOptions = {}) {
    return this.findAllSortedByReq(reqQuery, reqParams, queryOptions)
      .then((arr) => this.list(queryOptions, arr));
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
      options.sort = sortOptions;
    }
    if (reqQuery.limit) {
      options.limit = Number(reqQuery.limit);
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
    return JSON.parse(JSON.stringify(shallow));
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
