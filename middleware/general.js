const { DateTime } = require('luxon');
const { Readable } = require('stream');
const Event = require('../objects/event.js');
const { toProtoBuf, fromProtoBuf } = require('./protoBuf.js');

module.exports = {
  find(Model) {
    return (req, res, next) => {
      Model.findAllSortedByReq(req.query, req.params)
        .then((items) => {
          req.items = items;
          next();
        })
        .catch(next);
    };
  },
  findOne(Model) {
    return (req, res, next) => {
      Model.findOneByReq(req.query, req.params)
        .then((item) => {
          if (!item) {
            return res.status(404).send(Model.notFoundStatus(req.params.name));
          }
          req.item = item;
          next();
        })
        .catch(next);
    };
  },
  format(Model) {
    return (req, res, next) => {
      if (req.query?.watch === 'true') {
        let idsWritten = [];
        let eventStream = new Readable({
          read() {}
        });
        eventStream.pipe(res);
        if (req.headers?.accept?.includes('protobuf') && req.operationId) {
          res.set('Content-Type', 'application/vnd.kubernetes.protobuf');
        } else {
          res.set('Content-Type', 'application/json');
        }
        let arr = [req.item, ...req.items].flat().filter((e) => e);
        arr.forEach((i) => {
          i.events().on('updated', () => {
            Model.table([i]).then((table) => {
              let retObj = {
                "type": "MODIFIED",
                "object": table
              };
              if (req.headers?.accept?.includes('protobuf') && req.operationId) {
                try {
                  eventStream.push(toProtoBuf(retObj, req.operationId, req.protobufTypes));
                } catch (e) {
                  console.error(e);
                  next(Model.unprocessableContentStatus());
                }
              } else {
                table.columnDefinitions = null;
                eventStream.push(`${JSON.stringify(retObj)}\n`);
              }
            });
          });
          i.events().on('deleted', () => {
            Model.table([i]).then((table) => {
              let retObj = {
                "type": "DELETED",
                "object": table
              };
              if (req.headers?.accept?.includes('protobuf') && req.operationId) {
                try {
                  eventStream.push(toProtoBuf(retObj, req.operationId, req.protobufTypes));
                } catch (e) {
                  console.error(e);
                  next(Model.unprocessableContentStatus());
                }
              } else {
                table.columnDefinitions = null;
                eventStream.push(`${JSON.stringify(retObj)}\n`);
              }
            });
          });
        });
        Model.table(arr)
          .then((table) => {
            let retObj = {
              type: "ADDED",
              object: table,
            }
            if (req.headers?.accept?.includes('protobuf') && req.operationId) {
              try {
                eventStream.push(toProtoBuf(retObj, req.operationId, req.protobufTypes));
              } catch (e) {
                console.error(e);
                next(Model.unprocessableContentStatus());
              }
            } else {
              eventStream.push(`${JSON.stringify(retObj)}\n`);
            }
          })
          .catch(next);
        return;
      }
      if (req.headers?.accept?.split(';').find((e) => e === 'as=Table')) {
        let i = req.item || req.items;
        return Model.table([i].flat())
          .then((table) => res.status(200).send(table))
          .catch(next);
      }
      if (req.headers?.accept?.includes('protobuf') && req.operationId) {
        try {
          if (req.items) {
            req.items = toProtoBuf(req.items, req.operationId, req.protobufTypes);
          } else if (req.item) {
            req.item = toProtoBuf(req.item, req.operationId, req.protobufTypes);
          }
        } catch (e) {
          console.error(e);
          next(Model.unprocessableContentStatus());
        }
      }
      return next();
    };
  },
  raw(Model) {
    return (req, res, next) => {
      let i = req.item || req.items
      if (i || i.length) {
        return res.status(200).send(i);
      }
      return res.status(404).send(Model.notFoundStatus(req.params.name));
    };
  },
  list(Model) {
    return (req, res, next) => {
      return Model.listByReq(req.query, req.params)
      .then((list) => res.status(200).send(list))
      .catch(next);
    }
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
        if (!req.body.metadata?.creationTimestamp || typeof req.body.metadata.creationTimestamp !== 'String') {
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
          return res.status(200).send(new Model(item).successfulStatus());
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
