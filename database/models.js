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

const statusConditions = {
  conditions: {
    status: String,
    type: String,
    lastTransitionTime: Date,
    message: String,
    reason: String,
  }
};

const namespaceSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    finalizers: [ String ],
  },
  status: statusConditions,
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
    observedGeneration: Number,
    ...statusConditions,
  },
});

const podSchema = Schema(pod);

const ingressLoadBalancerStatus = {
  ingress: [{
    hostname: String,
    ip: String,
    ports: [{
      error: String,
      port: Number,
      protocol: String,
    }],
  }]
};

const serviceSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    allocateLoadBalancerNodePorts: Boolean,
    clusterIP: String,
    clusterIPs: { type: [ String ], default: [ ] },
    externalIPs: { type: [ String ], default: [ ] },
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
    ...statusConditions,
    loadBalancer: ingressLoadBalancerStatus,
  },
});

const typedLocalObjectReference = {
  apiGroup: String,
  kind: String,
  name: String,
}

const ingressServiceBackend = {
  name: String,
  port: {
    name: String,
    number: Number,
  }
};

const ingressSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    defaultBackend: {
      resource: typedLocalObjectReference,
      service: ingressServiceBackend,
    },
    ingressClassName: String,
    rules: {
      host: String,
      http: {
        paths: [{
          path: String,
          pathType: { type: String, required: true },
          backend: {
            resource: typedLocalObjectReference,
            service: ingressServiceBackend,
          },
        }]
      }
    },
    tls: {
      hosts: [String],
      secretName: String,
    }
  },
  status: {
    loadBalancer: ingressLoadBalancerStatus,
  },
});

const dns = Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'A',
      'NS',
      'MD',
      'MF',
      'CNAME',
      'SOA',
      'MB',
      'MG',
      'MR',
      'NULL',
      'WKS',
      'PTR',
      'HINFO',
      'MINFO',
      'MX',
      'TXT',
      'AAAA',
      'SRV',
      'EDNS',
      'SPF',
      'AXFR',
      'MAILB',
      'MAILA',
      'ANY',
      'CAA',
    ],
    required: true
  },
  class: {
    type: String,
    enum: [
      'IN',
      'CS',
      'CH',
      'HS',
      'ANY',
    ],
    required: true
  },
  ttl: {
    type: Number,
    required: true
  },
  address: {
    type: String,
    required: true
  },
});

const secretSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  data: {
    type: Map,
    of: String
  },
  immutable: Boolean,
  stringData: {
    type: Map,
    of: String
  },
  type: {
    type: String,
    default: "Opaque",
    enum: [
      'Opaque',
      'kubernetes.io/service-account-token',
      'kubernetes.io/dockercfg',
      'kubernetes.io/dockerconfigjson',
      'kubernetes.io/basic-auth',
      'kubernetes.io/ssh-auth',
      'kubernetes.io/tls',
      'bootstrap.kubernetes.io/token',
    ]
  },
})

const configMapSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  data: {
    type: Map,
    of: String
  },
  immutable: Boolean,
  binaryData: {
    type: Map,
    of: model.Binary
  }
})

const endpointsSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  subsets: [{
    addresses: [{
      ip: String,
      nodeName: String,
      targetRef: {
        kind: String,
        namespace: String,
        name: String,
        uid: String
      }
    }],
    notReadyAddresses: [{
      ip: String,
      nodeName: String,
      targetRef: {
        kind: String,
        namespace: String,
        name: String,
        uid: String
      }
    }],
    ports: [{
      name: String,
      port: Number,
      protocol: String
    }]
  }]
})

const role = {
  apiVersion: String,
  kind: String,
  metadata,
  rules: [{
    apiGroups: [String],
    resources: [String],
    verbs: [String],
    resourceNames: [String],
    nonResourceURLs: [String],
  }]
};

const roleSchema = Schema(role);

const clusterRoleSchema = Schema({
  ...role,
  aggregationRule: {
    clusterRoleSelectors: [{
      matchExpressions: {
        key: String,
        operator: String,
        values: String,
      },
      matchLabels: {
        type: Map,
        of: String
      },
    }]
  }
})

const roleBindingSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  roleRef: {
    apiGroup: String,
    kind: String,
    name: String,
  },
  subjects: [{
    apiGroups: [String],
    kind: [String],
    namespace: [String],
    name: [String],
  }]
})

const certificateSigningRequestSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    expirationSeconds: Number,
    extra: {
      type: Map,
      of: String
    },
    groups: [String],
    request: String,
    signerName: String,
    uid: String,
    usages: [String],
    username: String,
  },
  status: {
    certificate: String,
    ...statusConditions,
  }
})

module.exports = {
  Namespace: model('Namespace', namespaceSchema),
  Deployment: model('Deployment', deploymentSchema),
  Pod: model('Pod', podSchema),
  Service: model('Service', serviceSchema),
  Secret: model('Secret', secretSchema),
  ConfigMap: model('ConfigMap', configMapSchema),
  Ingress: model('Ingress', ingressSchema),
  ClusterRole: model('ClusterRole', clusterRoleSchema),
  ClusterRoleBinding: model('ClusterRoleBinding', roleBindingSchema),
  RoleBinding: model('RoleBinding', roleBindingSchema),
  Role: model('Role', roleSchema),
  CertificateSigningRequest: model('CertificateSigningRequest', certificateSigningRequestSchema),
  Endpoints: model('Endpoints', endpointsSchema),
  DNS: model('DNS', dns),
};
