const { Schema, model } = require('mongoose');
const { v4: uuid } = require('uuid');
const {
  Namespace,
} = require('../objects/index.js');

const metadata = {
  creationTimestamp: { type: Date, default: new Date() },
  uid: { type: String, default: uuid() },
  name: String,
  namespace: String,
  labels: {
    type: Map,
    of: String
  },
  annotations: {
    type: Map,
    of: String
  },
};

const namespaceSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    finalizers: [String],
  },
  status: {
    conditions: {
      status: String,
      type: String,
      lastTransitionTime: Date,
      message: String,
      reason: String,
    }
  },
});

namespaceSchema.loadClass(Namespace);

module.exports = {
  Namespace: model('NameSpace', namespaceSchema),
};
