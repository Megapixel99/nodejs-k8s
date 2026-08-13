const { DateTime } = require('luxon');
const EventEmitter = require('events');
const Status = require('./status.js');
const { busFor, keyFor } = require('./bus.js');

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
          return new this(obj).setResourceVersion();
        }
      });
  }

  static findByReq(reqQuery = {}, reqParams = {}, options = {}) {
    let q = this.genFindQuery(reqQuery, reqParams, options)
    return this.Model.find(q.params, q.projection, q.options)
      .then((arr) => {
        if (arr) {
          return Promise.all(arr.map((obj) => new this(obj).setResourceVersion()));
        }
      });
  }

  static findOne(params = {}, projection = {}, options = {}) {
    return this.Model.findOne(params, projection, options)
      .then((obj) => {
        if (obj) {
          return new this(obj).setResourceVersion();
        }
      });
  }

  static find(params = {}, projection = {}, options = {}) {
    return this.Model.find(params, projection, options)
      .then((arr) => {
        if (arr) {
          return Promise.all(arr.map((obj) => new this(obj).setResourceVersion()));
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
    return Model.findOneAndReplace(searchQ, replacement, { new: true, ...options })
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
    return this.Model.findOneAndUpdate(
      searchQ,
      updateObj,
      {
        new: true,
        ...options,
      }
    )
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
        resourceVersion: `${await this.hash(`${data.length}${JSON.stringify(data[0])}`)}`
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

  async setResourceVersion() {
    this.metadata = {
      ...this.metadata,
      resourceVersion: `${await K8Object.hash(JSON.stringify(this))}`
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
    if (reqQuery.resourceVersionMatch) {
      params['metadata.resourceVersion'] = reqQuery.resourceVersionMatch;
    }
    if (reqQuery.fieldSelector) {
      if ('true' === reqQuery.fieldSelector?.split('=')[1]) {
        projection[reqQuery.fieldSelector.split('=')[0]] = 1;
      } else if ('false' === reqQuery.fieldSelector?.split('=')[1]) {
        projection[reqQuery.fieldSelector.split('=')[0]] = 0;
      } else {
        params[reqQuery.fieldSelector.split('=')[0]] = reqQuery.fieldSelector?.split('=')[1];
      }
    }
    if (reqQuery.labelSelector) {
      // Comma-separated list of key=value / key!=value / key (presence).
      for (const clause of String(reqQuery.labelSelector).split(',')) {
        let c = clause.trim();
        if (!c) continue;
        let neq = c.split('!=');
        if (neq.length === 2) {
          params[`metadata.labels.${neq[0].trim()}`] = { $ne: neq[1].trim() };
          continue;
        }
        let eq = c.split('=');
        if (eq.length === 2) {
          params[`metadata.labels.${eq[0].trim()}`] = eq[1].trim();
        } else {
          params[`metadata.labels.${c}`] = { $exists: true };
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
