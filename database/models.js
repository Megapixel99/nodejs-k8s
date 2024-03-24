const { Schema, model } = require('mongoose');
const { v4: uuid } = require('uuid');
const {
  Namespace,
  Deployments,
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

const labelSelector = {
  matchExpressions: {
    key: String,
    operator: String,
    values: [String]
  },
  matchLabels: {
    type: Map,
    of: String
  },
}

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

const deploymentSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    selector: labelSelector,
    template: podTemplate,
    replicas: Int32,
    minReadySeconds: Int32,
    strategy: {
      type: String,
      rollingUpdate: {
        maxSurge: Schema.Types.Mixed,
        maxUnavailable: Schema.Types.Mixed
      }
    },
    revisionHistoryLimit: Int32,
    progressDeadlineSeconds: Int32,
    paused: Boolean,
  },
  status: {
    replicas: Int32,
    availableReplicas: Int32,
    unavailableReplicas: Int32,
    updatedReplicas: Int32,
    collisionCount: Int32,
    conditions: {
      status: String,
      type: String,
      lastTransitionTime: Date,
      lastUpdateTime: Date,
      message: String,
      reason: String,
    },
    observedGeneration: Int64,
  },
});

deploymentSchema.loadClass(Deployments);

module.exports = {
  Namespace: model('NameSpace', namespaceSchema),
  Deployment: model('Deployment', deploymentSchema)
};
