const { DateTime } = require('luxon');

module.exports = {
  find(Model) {
    return (req, res, next) => {
      Model.findByReq(req.query, req.params)
        .then((items) => {
          return res.status(200).send(items);
        })
        .catch(next);
    };
  },
  findOne(Model) {
    return (req, res, next) => {
      Model.findOneByReq(req.query, req.params)
        .then((item) => {
          if (item) {
            return res.status(200).send(item);
          }
          return res.status(404).send(Model.notFoundStatus(req.params.name));
        })
        .catch(next);
    };
  },
  list(Model) {
    return (req, res, next) => {
      if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
        return Model.table(req.query)
          .then((table) => res.status(200).send(table))
          .catch(next);
      }
      Model.listByReq(req.query, req.params)
      .then((list) => res.status(200).send(list))
      .catch(next);
    };
  },
  save(Model) {
    return (req, res, next) => {
      if (!req.body?.metadata) {
        req.body.metadata = {};
      }
      let query = { 'metadata.namespace': req.body.metadata.namespace };
      if (['Node', 'APIService', 'Binding', 'ComponentStatus', 'Lease', 'RuntimeClass', 'Namespace'].includes(Model.kind)) {
        if (!req.body.metadata?.name) {
          req.body.metadata.name = (req.params.name || "default");
        }
        query = { 'metadata.name': req.body.metadata.name };
      } else {
        if (!req.body.metadata?.namespace) {
          req.body.metadata.namespace = (req.params.namespace || "default");
        }
        if (req.params.name) {
          query['metadata.name'] = req.params.name;
        }
      }
      return Model.findOne(query)
      .then((item) => {
        if (item) {
          return res.status(202).send(item);
        }
        if (!req.body.metadata?.creationTimestamp) {
          req.body.metadata.creationTimestamp = DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "");
        }
        return Model.create(req.body)
        .then((item) => {
          res.status(201).send(item)
        })
      })
      .catch(next);
    };
  },
  update(Model) {
    return (req, res, next) => {
      let query = { 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace };
      if (!req.params.namespace) {
        query = { 'metadata.name': req.params.name };
      }
      if (Object.keys(req.body).length > 0) {
        Model.findOne(query)
        .then((item) => item ? item.update(req.body) : Promise.resolve())
        .then((item) => {
          if (item) {
            return res.status(201).send(item);
          }
          return res.status(404).send(Model.notFoundStatus(req.params.name));
        })
        .catch(next);
      } else {
        Model.findOne(query)
        .then((item) => {
          if (item) {
            return res.status(200).send(item);
          }
          return res.status(404).send(Model.notFoundStatus(req.params.name));
        })
        .catch(next);
      }
    }
  },
  patch(Model) {
    return (req, res, next) => {
      let query = { 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace };
      if (!req.params.namespace) {
        query = { 'metadata.name': req.params.name };
      }
      if (Object.keys(req.body).length > 0) {
        Model.findOne(query)
        .then((item) => item ? item.update(req.body) : Promise.resolve())
        .then((item) => {
          if (item) {
            return res.status(201).send(item);
          }
          return res.status(404).send(Model.notFoundStatus(req.params.name));
        })
        .catch(next);
      } else {
        Model.findOne(query)
        .then((item) => item ? res.status(200).send(item) : res.status(200).send({}))
        .catch(next);
      }
    };
  },
  deleteOne(Model) {
    return (req, res, next) => {
      let query = { 'metadata.name': req.params.name, 'metadata.namespace': req.params.namespace };
      if (!req.params.namespace) {
        query = { 'metadata.name': req.params.name };
      }
      Model.findOne(query)
      .then((item) => item ? item.delete() : Promise.resolve())
      .then((item) => {
        if (item) {
          return res.status(200).send(item.successfulStatus());
        }
        return res.status(404).send(Model.notFoundStatus(req.params.name));
      })
      .catch(next);
    };
  },
  delete(Model, sendRes = true) {
    return (req, res, next) => {
      if (req.body) {
        return Model.find(req.body)
        .then((items) => Promise.all(items.map((item) => item.delete({}))))
        .then((items) => {
          if (res.writableEnded === false && sendRes) {
            items ? res.status(200).send(items) : res.status(200).send({});
          }
        })
        .catch(next);
      }
      return Model.find({})
      .then((items) => Promise.all(items.map((item) => item.delete({}))))
      .then((items) => {
        if (res.writableEnded === false && sendRes) {
          items ? res.status(200).send(items) : res.status(200).send({});
        }
      })
      .catch(next);
    };
  }
};
