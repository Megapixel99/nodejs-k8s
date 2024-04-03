const { Schema, model } = require('mongoose');
const { v4: uuid } = require('uuid');

const metadata = {
  creationTimestamp: { type: Date, default: new Date() },
  uid: { type: String, default: uuid() },
  name: { type: String, required: true },
  generateName: String,
  resourceVersion: { type: String, default: "1" },
  annotations: {
    type: Map,
    of: String
  },
  deletionGracePeriodSeconds: Number,
  deletionTimestamp: Number,
  finalizers: [ String ],
  generateName: String,
  generation: Number,
  namespace: String,
  managedFields: {
    apiVersion: String,
    fieldsType: String,
    fieldsV1: String,
    manager: String,
    operation: String,
    subresource: String,
    time: String,
  },
  ownerReferences: {
    apiVersion: String,
    blockOwnerDeletion: Boolean,
    controller: Boolean,
    kind: String,
    name: String,
    uid: String,
  },
  resourceVersion: String,
  selfLink: String,
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
    values: { type: [ String ], default: undefined },
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
    command: { type: [ String ], default: undefined },
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
      add: { type: [ String ], default: undefined },
      drop: { type: [ String ], default: undefined },
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
      type: { type: String },
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
    podIP: { type: String, default: null },
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

// const podTemplate = {
//   metadata,
//   spec: pod.spec,
// }

const namespaceSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    finalizers: [ String ],
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

const deploymentSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    selector: labelSelector,
    template: pod,
    replicas: { type: Number, default: 1 },
    minReadySeconds: { type: Number, default: 30 },
    strategy: {
      type: { type: String, default: "RollingUpdate"},
      rollingUpdate: {
        maxSurge: { type: Schema.Types.Mixed, default: "25%" },
        maxUnavailable: { type: Schema.Types.Mixed, default: "25%" },
      }
    },
    revisionHistoryLimit: Number,
    progressDeadlineSeconds: Number,
    paused: { type: Boolean, default: false },
  },
  status: {
    observedGeneration: { type: Number, default: 0 },
    replicas: { type: Number, default: 0 },
    availableReplicas: { type: Number, default: 0 },
    readyReplicas: { type: Number, default: 0 },
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

const podSchema = Schema(pod);

const serviceSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    allocateLoadBalancerNodePorts: Boolean,
    clusterIP: String,
    clusterIPs: [ String ],
    externalIPs: [ String ],
    externalName: String,
    externalTrafficPolicy: String,
    healthCheckNodePort: String,
    internalTrafficPolicy: { type: String, default: "Cluster" },
    ipFamilies: { type: [ String ], default: [ "IPv4" ] },
    ipFamilyPolicy: String,
    loadBalancerClass: String,
    loadBalancerIP: String,
    loadBalancerSourceRanges: [ String ],
    ports: [{
      appProtocol: String,
      name: String,
      nodePort: Number,
      port: { type: Number, required: true },
      protocol: String,
      targetPort: Schema.Types.Mixed,
    }],
    publishNotReadyAddresses: Boolean,
    selector: {
      type: Map,
      of: String
    },
    sessionAffinity: { type: String, default: "None" },
    sessionAffinityConfig: {
      clientIP: {
        timeoutSeconds: Number,
      }
    },
    type: { type: String },
  },
  status: {
    conditions: {
      lastTransitionTime: String,
      message: String,
      observedGeneration: Number,
      reason: String,
      status: String,
      type: String,
    },
    loadBalancer: {
      ingress: {
        hostname: String,
        ip: String,
        ports: {
          error: String,
          port: Number,
          protocol: String,
        },
      }
    },
  },
});

module.exports = {
  Namespace: model('Namespace', namespaceSchema),
  Deployment: model('Deployment', deploymentSchema),
  Pod: model('Pod', podSchema),
  Service: model('Service', serviceSchema),
};
