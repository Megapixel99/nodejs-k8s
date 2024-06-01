const EventEmitter = require('events');
const Status = require('./status.js');

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

  static create(config, searchQ) {
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
        throw this.alreadyExistsStatus(config.metadata.name);
      }
      try {
        return new this.Model(config).save();
      } catch (e) {
        Model.unprocessableContentStatus();
      }
    })
    .then((obj) => {
      new this(obj).events().emit('created');
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
        return obj;
      }
    });
  }

  update(updateObj, searchQ, options = {}) {
    if (!searchQ) {
      searchQ = { 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace };
    }
    return this.Model.findOneAndUpdate(
      searchQ,
      updateObj,
      {
        new: true,
        ...options,
      }
    )
    .then((obj) => {
      if (obj) {
        this.events().emit('updated');
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
        // projection[reqQuery.fieldSelector.split('=')[0]] = 1;
      }
    }
    let options = {};
    if (Object.keys(sortOptions).length > 0) {
      options.sort = sortOptions;
    }
    if (sortOptions.limit) {
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
    let newObj = JSON.parse(JSON.stringify({ ...this }));
    delete newObj.Model;
    delete newObj.eventEmitter;
    return newObj;
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

  static notFoundStatus(kind = this.kind, name = undefined, group = undefined) {
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

  successfulStatus() {
    return new Status({
      status: 'Success',
      reason: 'Success',
      code: 200,
      message: 'Success',
      details: {
        name: this.metadata.name,
        kind: this.kind.toLowerCase(),
        uid: this.metadata.uid
      }
    });
  }

  static forbiddenStatus(kind = this.kind, name = undefined, group = undefined) {
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

  static unprocessableContentStatus(kind = this.kind, name = undefined, group = undefined, message = undefined) {
    return new Status({
      status: 'Failure',
      reason: 'UnprocessableContent',
      code: 422,
      message,
      details: {
        name,
        group,
        kind: kind ? kind.toLowerCase() : undefined,
      }
    });
  }

  static alreadyExistsStatus(kind = this.kind, name = undefined, group = undefined) {
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

  static internalServerErrorStatus(kind = this.kind, name = undefined, group = undefined) {
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
