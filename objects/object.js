const objects = require('./index.js');
const Status = require('./status.js');

class K8Object {
  constructor(config) {
    this.apiVersion = config.apiVersion;
    this.kind = config.kind;
    this.metadata = config.metadata;
    this.defaultSearchQ = { 'metadata.name': config.metadata.name, 'metadata.namespace': config.metadata.namespace };
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
    console.log(q);
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

  static create(config, searchQ) {
    if (!searchQ) {
      searchQ = { 'metadata.name': config.metadata.name, 'metadata.namespace': config.metadata.namespace };
    }
    return this.findOne()
    .then((existingObj) => {
      if (existingObj) {
        throw this.alreadyExistsStatus(config.metadata.name);
      }
      return new this.Model(config).save();
    })
    .then((obj) => obj);
  }

  delete (searchQ) {
    if (!searchQ) {
      searchQ = { 'metadata.name': this.metadata.name, 'metadata.namespace': this.metadata.namespace };
    }
    return this.Model.findOneAndDelete(searchQ)
    .then((obj) => {
      if (obj) {
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

  static list (queryOptions = {}) {
    return this.findAllSortedByReq(queryOptions)
      .then(async (arr) => ({
        apiVersion: this.apiVersion,
        kind: `${this.kind}List`,
        metadata: {
          continue: queryOptions?.limit < arr.length ? "true" : undefined,
          remainingItemCount: queryOptions.limit && queryOptions.limit < arr.length ? arr.length - queryOptions.limit : 0,
          resourceVersion: `${await this.hash(`${arr.length}${JSON.stringify(arr[0])}`)}`
        },
        items: arr
      }));
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

  getKind() {
    return this.kind;
  }

  getEventEmitter() {
    return this.objEmitter;
  }

  getApiVersion() {
    return this.apiVersion;
  }

  successfulStatus() {
    return new Status({
      status: 'Success',
      details: {
        name: this.metadata.name,
        kind: this.kind.toLowerCase(),
        uid: this.metadata.uid
      }
    });
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
