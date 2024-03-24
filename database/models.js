const { Schema, model } = require('mongoose');
const { v4: uuid } = require('uuid');
const {
  Namespace,
  Deployments,
  Pod,
} = require('../objects/index.js');

const metadata = {
  creationTimestamp: { type: Date, default: new Date() },
  uid: { type: String, default: uuid() },
  name: String,
  generateName: String,
  resourceVersion: String,
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
  matchExpressions: [{
    key: { type: String },
    operator: { type: String },
    values: { type: [String], default: undefined },
  }],
  matchLabels: {
    type: Map,
    of: String,
  },
}

const objectFieldSelector = {
  fieldPath: String,
  apiVersion: String,
}

const resourceFieldSelector = {
  resource: String,
  containerName: String,
  divisor: String,
}

const lifecycleHandler = {
  exec: {
    command: { type: [String], default: undefined },
    httpGet : {
      port: Schema.Types.Mixed,
      host: String,
      httpHeaders: {
        name: String,
        value: String,
      },
      path: String,
      scheme: String,
    },
    tcpSocket: {
      port: Schema.Types.Mixed,
      host: String,
    }
  }
}

const probe = {
  ...lifecycleHandler,
  initialDelaySeconds: Number,
  terminationGracePeriodSeconds: Number,
  periodSeconds: Number,
  timeoutSeconds: Number,
  failureThreshol: Number,
  dsuccessThreshold: Number,
  grpc: {
    port: Schema.Types.Mixed,
    service: String,
  }
}

const container = {
  name: String,
  image: String,
  ports: [{
    containerPort: Number,
    protocol: String,
    hostIP: String,
    hostPort: Number,
    name: String,
  }],
  env: [{
    name: String,
    value: String,
    valueFrom: {
      configMapKeyRef: {
        key: String,
        name: String,
        optional: Boolean,
      },
      fieldRef: objectFieldSelector,
      resourceFieldRef: resourceFieldSelector,
      secretKeyRef: {
        key: String,
        name: String,
        optional: Boolean,
      }
    }
  }],
  envFrom: [{
    configMapRef: {
      name: String,
      optional: Boolean,
    },
    prefix: String,
    secretRef: {
      name: String,
      optional: Boolean,
    }
  }],
  volumeMounts: [{
    mountPath: String,
    name: String,
    mountPropagation: String,
    readOnly: Boolean,
    subPath: String,
    subPathExpr: String,
  }],
  volumeDevices: [{
    devicePath: String,
    name: String,
  }],
  resources: {
    claims: [{
      name: String,
    }],
    limits: {
      type: Map,
      of: String
    },
    requests: {
      type: Map,
      of: String
    },
  },
  resizePolicy: [{
    resourceName: String,
    restartPolicy: String,
  }],
  lifecycle: {
    postStart: lifecycleHandler,
    preStop: lifecycleHandler,
  },
  terminationMessagePath: String,
  terminationMessagePolicy: String,
  livenessProbe: probe,
  readinessProbe: probe,
  startupProbe: probe,
  restartPolicy: String,
  securityContext: {
    runAsUser: Number,
    runAsNonRoot: Boolean,
    runAsGroup: Number,
    readOnlyRootFilesystem: Boolean,
    procMount: String,
    privileged: Boolean,
    allowPrivilegeEscalation: Boolean,
    capabilities: {
      add: { type: [String], default: undefined },
      drop: { type: [String], default: undefined },
    },
    seccompProfile: {
      type: String,
      localhostProfile: String,
    },
    seLinuxOptions: {
      level: String,
      role: String,
      type: String,
      user: String,
    },
    windowsOptions: {
      gmsaCredentialSpec: String,
      hostProcess: Boolean,
      runAsUserName: String,
    }
  },
  stdin: Boolean,
  stdinOnce: Boolean,
  tty: Boolean,
  command: String,
  args: String,
  workingDir: String,
  terminationMessagePath: String,
  terminationMessagePolicy: String,
  imagePullPolicy: String,
};

const ephemeralContainer = {
  name: String,
  targetContainerName: String,
}

const pod = {
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    initContainers: { type: [container], default: undefined },
    containers: { type: [container], default: undefined },
    ephemeralContainers: { type: [ephemeralContainer], default: undefined },
    imagePullSecrets: {
      name: String,
    },
    enableServiceLinks: Boolean,
    os: {
      name: String,
    },
    restartPolicy: String,
    activeDeadlineSeconds: Number,
    readinessGates: {
      conditionType: String,
    },
    terminationGracePeriodSeconds: Number,
    dnsPolicy: String,
    securityContext: {},
    schedulerName: String,
  },
  status: {
    nominatedNodeName: String,
    phase: {
      type: String,
      enum: [ 'Pending', 'Running', 'Succeeded', 'Failed', 'Unknown' ],
      default: 'Pending'
    },
    conditions: [{
      type: String,
      status: {
        type: String,
        enum: [ 'True', 'False', 'Unknown' ],
        default: 'False'
      },
      lastProbeTime: Date,
      reason: String,
      message: String,
      lastTransitionTime: Date
    }],
    hostIP: String,
    podIP: String,
    podIPs: [{
      ip: String
    }],
    startTime: Date,
    containerStatuses: [{
      restartCount: { type: Number, default: 0 },
      started: Boolean,
      ready: Boolean,
      name: String,
      state: {
        running: {
          startedAt: String
        }
      },
      imageID: String,
      image: String,
      lastState: {},
      containerID: String
    }],
    qosClass: String
  }
}

const podTemplate = {
  metadata,
  spec: pod.spec,
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
    replicas: Number,
    minReadySeconds: Number,
    strategy: {
      type: { type: String },
      rollingUpdate: {
        maxSurge: Schema.Types.Mixed,
        maxUnavailable: Schema.Types.Mixed
      }
    },
    revisionHistoryLimit: Number,
    progressDeadlineSeconds: Number,
    paused: Boolean,
  },
  status: {
    replicas: { type: Number, default: 0 },
    availableReplicas: { type: Number, default: 0 },
    unavailableReplicas: { type: Number, default: 0 },
    updatedReplicas: { type: Number, default: 0 },
    collisionCount: Number,
    conditions: {
      status: String,
      type: String,
      lastTransitionTime: Date,
      lastUpdateTime: Date,
      message: String,
      reason: String,
    },
    observedGeneration: Number,
  },
});

deploymentSchema.loadClass(Deployments);

const podSchema = Schema(pod);

podSchema.loadClass(Pod);

module.exports = {
  Namespace: model('Namespace', namespaceSchema),
  Deployment: model('Deployment', deploymentSchema),
  Pod: model('Pod', podSchema),
};
