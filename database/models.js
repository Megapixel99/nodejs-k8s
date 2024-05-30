const {
  Schema,
  model
} = require('mongoose');
const {
  DateTime
} = require('luxon');
const {
  v4: uuid
} = require('uuid');

const ref = {
  ip: String,
  nodeName: String,
  targetRef: {
    kind: String,
    namespace: String,
    name: String,
    uid: {
      type: String,
      default: uuid()
    }
  }
};

const metadata = {
  creationTimestamp: {
    type: String,
    default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
  },
  uid: {
    type: String,
    default: uuid()
  },
  name: {
    type: String,
    required: true
  },
  generateName: String,
  resourceVersion: {
    type: String,
    default: "1"
  },
  annotations: {
    type: Map,
    of: String
  },
  deletionGracePeriodSeconds: Number,
  deletionTimestamp: {
    type: String,
    default: null
  },
  finalizers: [String],
  generateName: String,
  generation: {
    type: Number,
    default: 0
  },
  namespace: String,
  managedFields: [{
    apiVersion: String,
    fieldsType: String,
    fieldsV1: String,
    manager: String,
    operation: String,
    subresource: String,
    time: {
      type: String,
      default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
    },
  }],
  ownerReferences: [ref],
  selfLink: String,
  labels: {
    type: Map,
    of: String
  },
};

const glusterfs = {
  endpoints: String,
  endpointsNamespace: String,
  path: String,
  readOnly: Boolean,
};

const labelSelector = {
  matchExpressions: [{
    key: {
      type: String
    },
    operator: {
      type: String
    },
    values: {
      type: [String],
      default: undefined
    },
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
    command: {
      type: [String],
      default: undefined
    },
    httpGet: {
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

const configMapInfo = {
  kubeletConfigKey: String,
  name: String,
  namespace: String,
  resourceVersion: String,
  uid: {
    type: String,
    default: uuid()
  },
};

const lifecycle = {
  postStart: lifecycleHandler,
  preStop: lifecycleHandler,
};

const statusConditions = {
  status: {
    type: String,
    enum: ['True', 'False', 'Unknown'],
    default: 'False'
  },
  type: {
    type: String
  },
  lastTransitionTime: {
    type: String,
    default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
  },
  message: String,
  reason: String,
};

const volumeDevices = [{
  devicePath: String,
  name: String,
}];

const volumeMounts = [{
  mountPath: String,
  mountPropagation: String,
  name: String,
  readOnly: Boolean,
  subPath: String,
  subPathExpr: String,
}]

const probe = {
  ...lifecycleHandler,
  initialDelaySeconds: {
    type: Number,
    default: 0
  },
  terminationGracePeriodSeconds: {
    type: Number,
    default: 0
  },
  periodSeconds: {
    type: Number,
    default: 0
  },
  timeoutSeconds: {
    type: Number,
    default: 0
  },
  failureThreshold: {
    type: Number,
    default: 0
  },
  dsuccessThreshold: {
    type: Number,
    default: 0
  },
  grpc: {
    port: Schema.Types.Mixed,
    service: String,
  }
}

const containerPortInfo = {
  containerPort: {
    type: Number,
    default: 0
  },
  protocol: String,
  hostIP: String,
  hostPort: {
    type: Number,
    default: 0
  },
  name: String,
};

const env = {
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
};

const envFrom = {
  configMapRef: {
    name: String,
    optional: Boolean,
  },
  prefix: String,
  secretRef: {
    name: String,
    optional: Boolean,
  }
};

const iscsi = {
  chapAuthDiscovery: Boolean,
  chapAuthSession: Boolean,
  fsType: String,
  initiatorName: String,
  iqn: String,
  iscsiInterface: String,
  lun: {
    type: Number,
    default: 0
  },
  portals: [String],
  readOnly: Boolean,
  secretRef: {
    name: String,
    namespace: String,
  },
  targetPortal: String,
};

const container = {
  name: String,
  image: String,
  ports: [containerPortInfo],
  env: [env],
  envFrom: [envFrom],
  volumeMounts,
  volumeDevices,
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
  lifecycle,
  terminationMessagePath: String,
  terminationMessagePolicy: String,
  livenessProbe: probe,
  readinessProbe: probe,
  startupProbe: probe,
  restartPolicy: String,
  securityContext: {
    runAsUser: {
      type: Number,
      default: 0
    },
    runAsNonRoot: Boolean,
    runAsGroup: {
      type: Number,
      default: 0
    },
    readOnlyRootFilesystem: Boolean,
    procMount: String,
    privileged: Boolean,
    allowPrivilegeEscalation: Boolean,
    capabilities: {
      add: {
        type: [String],
        default: undefined
      },
      drop: {
        type: [String],
        default: undefined
      },
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
  command: [String],
  args: String,
  workingDir: String,
  terminationMessagePath: String,
  terminationMessagePolicy: String,
  imagePullPolicy: String,
};

const metricInfo = {
  metric: {
    name: String,
    selector: labelSelector,
  },
};

const targetMetricInfo = {
  ...metricInfo,
  target: {
    averageUtilization: {
      type: Number,
      default: 0
    },
    averageValue: String,
    type: String,
    value: String,
  },
};

const currentMetricInfo = {
  ...metricInfo,
  current: {
    averageUtilization: {
      type: Number,
      default: 0
    },
    averageValue: String,
    value: String,
  },
};

const podFailurePolicy = {
  rules: [{
    action: String,
    onExitCodes: {
      containerName: String,
      operator: String,
      values: [{
        type: Number,
        default: 0
      }],
    },
    onPodConditions: [{
      status: String,
      type: String,
    }],
  }],
};

const metrics = {
  containerResource: {
    container: String,
    current: {
      averageUtilization: {
        type: Number,
        default: 0
      },
      averageValue: String,
      value: String,
    },
    name: String,
  },
  external: currentMetricInfo,
  object: {
    describedObject: {
      apiVersion: String,
      kind: String,
      name: String,
    },
    ...currentMetricInfo
  },
  pods: currentMetricInfo,
  resource: {
    current: {
      averageUtilization: {
        type: Number,
        default: 0
      },
      averageValue: String,
      value: String,
    },
    name: String,
  },
  type: String,
};

const fieldSelector = {
  matchExpressions: [{
    key: String,
    operator: String,
    values: [String],
  }],
  matchFields: [{
    key: String,
    operator: String,
    values: [String],
  }],
};

const nodeAffinity = {
  required: {
    nodeSelectorTerms: [fieldSelector],
  },
};

const rbd = {
  fsType: String,
  image: String,
  keyring: String,
  monitors: [String],
  pool: String,
  readOnly: Boolean,
  secretRef: {
    name: String,
    namespace: String,
  },
  user: String,
};

const containerStatus = {
  allocatedResources: {
    type: Map,
    of: String,
  },
  containerID: String,
  image: String,
  imageID: String,
  lastState: {
    running: {
      startedAt: String,
    },
    terminated: {
      containerID: String,
      exitCode: {
        type: Number,
        default: 0
      },
      finishedAt: String,
      message: String,
      reason: String,
      signal: {
        type: Number,
        default: 0
      },
      startedAt: String,
    },
    waiting: {
      message: String,
      reason: String,
    },
  },
  name: String,
  ready: Boolean,
  resources: {
    claims: [{
      name: String,
    }],
    limits: {
      type: Map,
      of: String,
    },
    requests: {
      type: Map,
      of: String,
    },
  },
  restartCount: {
    type: Number,
    default: 0
  },
  started: Boolean,
  state: {
    running: {
      startedAt: String,
    },
    terminated: {
      containerID: String,
      exitCode: {
        type: Number,
        default: 0
      },
      finishedAt: String,
      message: String,
      reason: String,
      signal: {
        type: Number,
        default: 0
      },
      startedAt: String,
    },
    waiting: {
      message: String,
      reason: String,
    },
  },
};

const nfs = {
  path: String,
  readOnly: Boolean,
  server: String,
};

const volumeInfo = {
  awsElasticBlockStore: {
    fsType: String,
    partition: {
      type: Number,
      default: 0
    },
    readOnly: Boolean,
    volumeID: String,
  },
  azureDisk: {
    cachingMode: String,
    diskName: String,
    diskURI: String,
    fsType: String,
    kind: String,
    readOnly: Boolean,
  },
  azureFile: {
    readOnly: Boolean,
    secretName: String,
    shareName: String,
  },
  cephfs: {
    monitors: [String],
    path: String,
    readOnly: Boolean,
    secretFile: String,
    secretRef: {
      name: String,
    },
    user: String,
  },
  cinder: {
    fsType: String,
    readOnly: Boolean,
    secretRef: {
      name: String,
    },
    volumeID: String,
  },
  csi: {
    driver: String,
    fsType: String,
    nodePublishSecretRef: {
      name: String,
    },
    readOnly: Boolean,
    volumeAttributes: {
      type: Map,
      of: String,
    },
  },
  fc: {
    fsType: String,
    lun: {
      type: Number,
      default: 0
    },
    readOnly: Boolean,
    targetWWNs: [String],
    wwids: [String],
  },
  flexVolume: {
    driver: String,
    fsType: String,
    options: {
      type: Map,
      of: String,
    },
    readOnly: Boolean,
    secretRef: {
      name: String,
    },
  },
  flocker: {
    datasetName: String,
    datasetUUID: String,
  },
  gcePersistentDisk: {
    fsType: String,
    partition: {
      type: Number,
      default: 0
    },
    pdName: String,
    readOnly: Boolean,
  },
  glusterfs,
  hostPath: {
    path: String,
    type: String,
  },
  iscsi,
  nfs,
  photonPersistentDisk: {
    fsType: String,
    pdID: String,
  },
  portworxVolume: {
    fsType: String,
    readOnly: Boolean,
    volumeID: String,
  },
  quobyte: {
    group: String,
    readOnly: Boolean,
    registry: String,
    tenant: String,
    user: String,
    volume: String,
  },
  rbd: {
    fsType: String,
    image: String,
    keyring: String,
    monitors: [String],
    pool: String,
    readOnly: Boolean,
    secretRef: {
      name: String,
    },
    user: String,
  },
  scaleIO: {
    fsType: String,
    gateway: String,
    protectionDomain: String,
    readOnly: Boolean,
    secretRef: {
      name: String,
    },
    sslEnabled: Boolean,
    storageMode: String,
    storagePool: String,
    system: String,
    volumeName: String,
  },
  storageos: {
    fsType: String,
    readOnly: Boolean,
    secretRef: {
      name: String,
    },
    volumeName: String,
    volumeNamespace: String,
  },
  vsphereVolume: {
    fsType: String,
    storagePolicyID: String,
    storagePolicyName: String,
    volumePath: String,
  },
}

const podAffinity = {
  preferredDuringSchedulingIgnoredDuringExecution: [{
    podAffinityTerm: {
      labelSelector,
      namespaceSelector: labelSelector,
      namespaces: [String],
      topologyKey: String,
    },
    weight: {
      type: Number,
      default: 0
    },
  }],
  requiredDuringSchedulingIgnoredDuringExecution: [{
    labelSelector: labelSelector,
    namespaceSelector: labelSelector,
    namespaces: [String],
    topologyKey: String,
  }]
}

const persistentVolumeClaimSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'PersistentVolumeClaim',
  },
  metadata,
  spec: {
    accessModes: [String],
    dataSource: {
      apiGroup: String,
      kind: String,
      name: String,
    },
    dataSourceRef: {
      apiGroup: String,
      kind: String,
      name: String,
      namespace: String,
    },
    resources: {
      claims: [{
        name: String,
      }],
      limits: {
        type: Map,
        of: String,
      },
      requests: {
        type: Map,
        of: String,
      },
    },
    selector: labelSelector,
    storageClassName: String,
    volumeMode: String,
    volumeName: String,
  },
  status: {
    accessModes: [String],
    allocatedResources: {
      type: Map,
      of: String,
    },
    capacity: {
      type: Map,
      of: String,
    },
    conditions: [{
      ...statusConditions,
      lastProbeTime: {
        type: String,
        default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
      },
    }],
    phase: String,
    resizeStatus: String,
  },
});

const volumeSchema = Schema({
  ...volumeInfo,
  configMap: {
    defaultMode: {
      type: Number,
      default: 0
    },
    items: [{
      key: String,
      mode: {
        type: Number,
        default: 0
      },
      path: String,
    }],
    name: String,
    optional: Boolean,
  },
  downwardAPI: {
    defaultMode: {
      type: Number,
      default: 0
    },
    items: [{
      fieldRef: objectFieldSelector,
      mode: {
        type: Number,
        default: 0
      },
      path: String,
      resourceFieldRef: resourceFieldSelector,
    }],
  },
  emptyDir: {
    medium: String,
    sizeLimit: String,
  },
  ephemeral: {
    volumeClaimTemplate: persistentVolumeClaimSchema,
  },
  gitRepo: {
    directory: String,
    repository: String,
    revision: String,
  },
  name: String,
  persistentVolumeClaim: {
    claimName: String,
    readOnly: Boolean,
  },
  projected: {
    defaultMode: {
      type: Number,
      default: 0
    },
    sources: [{
      configMap: {
        items: [{
          key: String,
          mode: {
            type: Number,
            default: 0
          },
          path: String,
        }],
        name: String,
        optional: Boolean,
      },
      downwardAPI: {
        items: [{
          fieldRef: objectFieldSelector,
          mode: {
            type: Number,
            default: 0
          },
          path: String,
          resourceFieldRef: resourceFieldSelector,
        }],
      },
      secret: {
        items: [{
          key: String,
          mode: {
            type: Number,
            default: 0
          },
          path: String,
        }],
        name: String,
        optional: Boolean,
      },
      serviceAccountToken: {
        audience: String,
        expirationSeconds: {
          type: Number,
          default: 0
        },
        path: String,
      },
    }],
  },
  secret: {
    defaultMode: {
      type: Number,
      default: 0
    },
    items: [{
      key: String,
      mode: {
        type: Number,
        default: 0
      },
      path: String,
    }],
    optional: Boolean,
    secretName: String,
  },
});

const pod = {
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'Pod',
  },
  metadata,
  spec: {
    activeDeadlineSeconds: {
      type: Number,
      default: 0
    },
    affinity: {
      nodeAffinity: {
        preferredDuringSchedulingIgnoredDuringExecution: [{
          preference: fieldSelector,
          weight: {
            type: Number,
            default: 0
          },
        }],
        requiredDuringSchedulingIgnoredDuringExecution: {
          nodeSelectorTerms: [fieldSelector],
        },
      },
      podAffinity: podAffinity,
      podAntiAffinity: podAffinity,
    },
    automountServiceAccountToken: Boolean,
    containers: [container],
    dnsConfig: {
      nameservers: [String],
      options: [{
        name: String,
        value: String,
      }],
      searches: [String],
    },
    dnsPolicy: String,
    enableServiceLinks: Boolean,
    ephemeralContainers: [container],
    hostAliases: [{
      hostnames: [String],
      ip: String,
    }],
    hostIPC: Boolean,
    hostNetwork: Boolean,
    hostPID: Boolean,
    hostUsers: Boolean,
    hostname: String,
    imagePullSecrets: [{
      name: String,
    }],
    initContainers: [container],
    nodeName: String,
    nodeSelector: {
      type: Map,
      of: String,
    },
    os: {
      name: String,
    },
    overhead: {
      type: Map,
      of: String,
    },
    preemptionPolicy: String,
    priority: {
      type: Number,
      default: 0
    },
    priorityClassName: String,
    readinessGates: [{
      conditionType: String,
    }],
    resourceClaims: [{
      name: String,
      source: {
        resourceClaimName: String,
        resourceClaimTemplateName: String,
      },
    }],
    restartPolicy: String,
    runtimeClassName: String,
    schedulerName: String,
    schedulingGates: [{
      name: String,
    }],
    securityContext: {
      fsGroup: {
        type: Number,
        default: 0
      },
      fsGroupChangePolicy: String,
      runAsGroup: {
        type: Number,
        default: 0
      },
      runAsNonRoot: Boolean,
      runAsUser: {
        type: Number,
        default: 0
      },
      seLinuxOptions: {
        level: String,
        role: String,
        type: String,
        user: String,
      },
      seccompProfile: {
        localhostProfile: String,
        type: String,
      },
      supplementalGroups: [Number],
      sysctls: [{
        name: String,
        value: String,
      }],
      windowsOptions: {
        gmsaCredentialSpec: String,
        gmsaCredentialSpecName: String,
        hostProcess: Boolean,
        runAsUserName: String,
      },
    },
    serviceAccount: String,
    serviceAccountName: String,
    setHostnameAsFQDN: Boolean,
    shareProcessNamespace: Boolean,
    subdomain: String,
    terminationGracePeriodSeconds: {
      type: Number,
      default: 0
    },
    tolerations: [{
      effect: String,
      key: String,
      operator: String,
      tolerationSeconds: {
        type: Number,
        default: 0
      },
      value: String,
    }],
    topologySpreadConstraints: [{
      labelSelector: {
        matchExpressions: [{
          key: String,
          operator: String,
          values: [String],
        }],
        matchLabels: {
          type: Map,
          of: String,
        },
      },
      matchLabelKeys: [String],
      maxSkew: {
        type: Number,
        default: 0
      },
      minDomains: {
        type: Number,
        default: 0
      },
      nodeAffinityPolicy: String,
      nodeTaintsPolicy: String,
      topologyKey: String,
      whenUnsatisfiable: String,
    }],
    volumes: [volumeSchema],
  },
  status: {
    conditions: [{
      ...statusConditions,
      lastTransitionTime: String,
    }],
    containerStatuses: [containerStatus],
    ephemeralContainerStatuses: [containerStatus],
    hostIP: String,
    initContainerStatuses: [containerStatus],
    message: String,
    nominatedNodeName: String,
    phase: { type: String, default: 'Not Running' },
    podIP: {
      type: String,
      default: null
    },
    podIPs: [{
      ip: String,
    }],
    qosClass: String,
    reason: String,
    resize: String,
    startTime: String,
  },
}

const typedLocalObjectReference = {
  apiGroup: String,
  kind: String,
  name: String,
}

const ingressServiceBackend = {
  name: String,
  port: {
    name: String,
    number: {
      type: Number,
      default: 0
    },
  }
};

const jobInfo = {
  metadata,
  spec: {
    activeDeadlineSeconds: {
      type: Number,
      default: 0
    },
    backoffLimit: {
      type: Number,
      default: 0
    },
    completionMode: String,
    completions: {
      type: Number,
      default: 0
    },
    manualSelector: Boolean,
    parallelism: {
      type: Number,
      default: 0
    },
    podFailurePolicy,
    selector: labelSelector,
    suspend: Boolean,
    template: pod,
    ttlSecondsAfterFinished: {
      type: Number,
      default: 0
    },
  },
  status: {
    active: {
      type: Number,
      default: 0
    },
    completedIndexes: String,
    completionTime: {
      type: String,
      default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
    },
    conditions: [statusConditions],
    failed: {
      type: Number,
      default: 0
    },
    ready: {
      type: Number,
      default: 0
    },
    startTime: {
      type: String,
      default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
    },
    succeeded: {
      type: Number,
      default: 0
    },
    uncountedTerminatedPods: {
      failed: [String],
      succeeded: [String],
    },
  },
}

const podTemplateSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'PodTemplate',
  },
  metadata,
  template: pod
});

const namespaceSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'Namespace',
  },
  metadata,
  spec: {
    finalizers: {
      type: [String],
      default: ['kubernetes']
    },
  },
  status: {
    phase: {
      type: String,
      default: 'Active'
    },
  },
});

const deploymentSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'Deployment',
  },
  metadata,
  spec: {
    minReadySeconds: {
      type: Number,
      default: 0
    },
    paused: Boolean,
    progressDeadlineSeconds: {
      type: Number,
      default: 0
    },
    replicas: {
      type: Number,
      default: 0
    },
    revisionHistoryLimit: {
      type: Number,
      default: 0
    },
    fieldSelector,
    strategy: {
      rollingUpdate: {
        maxSurge: String,
        maxUnavailable: String,
      },
      type: String,
    },
    template: pod,
  },
  status: {
    availableReplicas: {
      type: Number,
      default: 0
    },
    collisionCount: {
      type: Number,
      default: 0
    },
    conditions: [{
      ...statusConditions,
      lastUpdateTime: String,
    }],
    observedGeneration: {
      type: Number,
      default: 0
    },
    readyReplicas: {
      type: Number,
      default: 0
    },
    replicas: {
      type: Number,
      default: 0
    },
    unavailableReplicas: {
      type: Number,
      default: 0
    },
    updatedReplicas: {
      type: Number,
      default: 0
    },
  },
});

const podSchema = Schema(pod);

const ingressLoadBalancerStatus = {
  ingress: [{
    hostname: String,
    ip: String,
    ports: [{
      error: String,
      port: {
        type: Number,
        default: 0
      },
      protocol: String,
    }],
  }]
};

const serviceSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'Service',
  },
  metadata,
  spec: {
    allocateLoadBalancerNodePorts: Boolean,
    clusterIP: String,
    clusterIPs: {
      type: [String],
      default: []
    },
    externalIPs: {
      type: [String],
      default: []
    },
    externalName: String,
    externalTrafficPolicy: String,
    healthCheckNodePort: String,
    internalTrafficPolicy: {
      type: String,
      default: "Cluster"
    },
    ipFamilies: {
      type: [String],
      default: ["IPv4"]
    },
    ipFamilyPolicy: String,
    loadBalancerClass: String,
    loadBalancerIP: String,
    loadBalancerSourceRanges: [String],
    ports: [{
      appProtocol: String,
      name: String,
      nodePort: {
        type: Number,
        default: 0
      },
      port: {
        type: Number,
        required: true
      },
      protocol: String,
      targetPort: Schema.Types.Mixed,
    }],
    publishNotReadyAddresses: Boolean,
    selector: {
      type: Map,
      of: String
    },
    sessionAffinity: {
      type: String,
      default: "None"
    },
    sessionAffinityConfig: {
      clientIP: {
        timeoutSeconds: {
          type: Number,
          default: 0
        },
      }
    },
    type: {
      type: String
    },
  },
  status: {
    ...statusConditions,
    loadBalancer: ingressLoadBalancerStatus,
  },
});

const apiServiceSchema = Schema({
  apiVersion: {
    type: String,
    default: 'apiregistration.k8s.io/v1',
  },
  kind: {
    type: String,
    default: 'APIService',
  },
  metadata,
  spec: {
    caBundle: String,
    group: String,
    groupPriorityMinimum: {
      type: Number,
      default: 0
    },
    insecureSkipTLSVerify: Boolean,
    service: {
      name: String,
      namespace: String,
      port: {
        type: Number,
        default: 0
      },
    },
    version: String,
    versionPriority: {
      type: Number,
      default: 0
    },
  },
  status: {
    conditions: [statusConditions],
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
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'Secret',
  },
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
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'ConfigMap',
  },
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
  apiVersion: {
    type: String,
    default: 'networking.k8s.io/v1',
  },
  kind: {
    type: String,
    default: 'Endpoints',
  },
  metadata,
  subsets: [{
    addresses: [ref],
    notReadyAddresses: [ref],
    ports: [{
      name: String,
      port: {
        type: Number,
        default: 0
      },
      protocol: String
    }]
  }]
})

const role = {
  apiVersion: {
    type: String,
    default: 'rbac.authorization.k8s.io/v1',
  },
  kind: {
    type: String,
    default: 'Role',
  },
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
  apiVersion: {
    type: String,
    default: 'rbac.authorization.k8s.io/v1',
  },
  kind: {
    type: String,
    default: 'ClusterRole',
  },
  aggregationRule: {
    clusterRoleSelectors: [labelSelector]
  }
})

const roleBindingSchema = Schema({
  apiVersion: {
    type: String,
    default: 'rbac.authorization.k8s.io/v1',
  },
  kind: {
    type: String,
    default: 'RoleBinding',
  },
  metadata,
  roleRef: {
    apiGroup: String,
    kind: String,
    name: String,
  },
  subjects: [{
    apiGroups: String,
    kind: String,
    namespace: String,
    name: String,
  }]
})

const clusterRoleBindingSchema = roleBindingSchema;

const certificateSigningRequestSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'CertificateSigningRequest',
  },
  metadata,
  spec: {
    expirationSeconds: {
      type: Number,
      default: 0
    },
    extra: {
      type: Map,
      of: String
    },
    groups: [String],
    request: String,
    signerName: String,
    uid: {
      type: String,
      default: uuid()
    },
    usages: [String],
    username: String,
  },
  status: {
    certificate: String,
    ...statusConditions,
  }
})



const nodeSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'Node',
  },
  metadata,
  spec: {
    configSource: {
      configMap: configMapInfo,
    },
    externalID: String,
    podCIDR: String,
    podCIDRs: [String],
    providerID: String,
    taints: [{
      effect: {
        type: String
      },
      key: {
        type: String
      },
      timeAdded: {
        type: String
      },
      value: {
        type: String
      },
    }],
    unschedulable: {
      type: Boolean,
      default: false
    },
  },
  status: {
    addresses: [{
      address: String,
      type: {
        type: String
      },
    }],
    allocatable: {
      type: Map,
      of: String,
    },
    capacity: {
      type: Map,
      of: String,
    },
    conditions: [{
      ...statusConditions,
      lastHeartbeatTime: {
        type: String,
        default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
      },
    }],
    config: {
      active: {
        configMap: configMapInfo,
      },
    },
    assigned: {
      configMap: configMapInfo,
    },
    error: String,
    lastKnownGood: {
      configMap: configMapInfo,
    },
    daemonEndpoints: {
      kubeletEndpoint: {
        Port: {
          type: Number,
          default: 0
        },
      },
    },
    images: [{
      names: [String],
      sizeBytes: {
        type: Number,
        default: 0
      },
    }],
    nodeInfo: {
      architecture: String,
      bootID: String,
      containerRuntimeVersion: String,
      kernelVersion: String,
      kubeProxyVersion: String,
      kubeletVersion: String,
      machineID: String,
      operatingSystem: String,
      osImage: String,
      systemUUID: String,
    },
    phase: String,
    volumesAttached: [{
      devicePath: String,
      name: String,
    }],
    volumesInUse: [String],
  },
})

const objectReferenceSchema = Schema({
  kind: {
    type: String,
    default: '',
  },
  namespace: String,
  name: String,
  uid: {
    type: String,
    default: uuid()
  },
  apiVersion: {
    type: String,
    default: '',
  },
  resourceVersion: String,
  fieldPath: String,
});

const eventSchema = Schema({
  apiVersion: {
    type: String,
    default: 'events.k8s.io/v1',
  },
  kind: {
    type: String,
    default: 'Event',
  },
  metadata,
  action: String,
  deprecatedCount: {
    type: Number,
    default: 0
  },
  deprecatedFirstTimestamp: {
    type: String,
    default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ".000000")
  },
  deprecatedLastTimestamp: {
    type: String,
    default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ".000000")
  },
  deprecatedSource: {
    component: String,
    host: String,
  },
  note: String,
  reason: String,
  regarding: objectReferenceSchema,
  related: objectReferenceSchema,
  reportingController: String,
  reportingInstance: String,
  series: {
    count: {
      type: Number,
      default: 0
    },
    lastObservedTime: {
      type: String,
      default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ".000000")
    },
  },
  type: {
    type: String,
    enum: ['Normal', 'Warning']
  },
})

const replicaSetSchema = Schema({
  apiVersion: {
    type: String,
    default: 'apps/v1',
  },
  kind: {
    type: String,
    default: 'ReplicaSet',
  },
  metadata,
  spec: {
    selector: labelSelector,
    template: pod,
    minReadySeconds: {
      type: Number,
      default: 0
    },
    replicas: {
      type: Number,
      default: 1
    },
  },
  status: {
    replicas: {
      type: Number,
      default: 0
    },
    availableReplicas: {
      type: Number,
      default: 0
    },
    readyReplicas: {
      type: Number,
      default: 0
    },
    fullyLabeledReplicas: {
      type: Number,
      default: 0
    },
    conditions: [statusConditions],
    observedGeneration: {
      type: Number,
      default: 0
    },
  }
})

const daemonSetSchema = Schema({
  apiVersion: {
    type: String,
    default: 'apps/v1',
  },
  kind: {
    type: String,
    default: 'DaemonSet',
  },
  metadata,
  spec: {
    selector: labelSelector,
    template: pod,
    minReadySeconds: {
      type: Number,
      default: 0
    },
    updateStrategy: {
      type: {
        type: String,
        enum: ['RollingUpdate', 'OnDelete']
      },
      rollingUpdate: {
        maxSurge: String,
        maxUnavailable: String,
      }
    },
    revisionHistoryLimit: {
      type: Number,
      default: 10
    },
  },
  status: {
    numberReady: {
      type: Number,
      default: 0
    },
    numberAvailable: {
      type: Number,
      default: 0
    },
    numberUnavailable: {
      type: Number,
      default: 0
    },
    numberMisschedule: {
      type: Number,
      default: 0
    },
    desiredNumberScheduled: {
      type: Number,
      default: 0
    },
    currentNumberScheduled: {
      type: Number,
      default: 0
    },
    updatedNumberScheduled: {
      type: Number,
      default: 0
    },
    collisionCount: {
      type: Number,
      default: 0
    },
    conditions: [statusConditions],
    observedGeneration: {
      type: Number,
      default: 0
    },
  }
})

const replicationControllerSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'ReplicationController',
  },
  metadata,
  spec: {
    minReadySeconds: {
      type: Number,
      default: 0
    },
    replicas: {
      type: Number,
      default: 0
    },
    selector: labelSelector,
    template: pod,
  },
  status: {
    availableReplicas: {
      type: Number,
      default: 0
    },
    conditions: [statusConditions],
    fullyLabeledReplicas: {
      type: Number,
      default: 0
    },
    observedGeneration: {
      type: Number,
      default: 0
    },
    readyReplicas: {
      type: Number,
      default: 0
    },
    replicas: {
      type: Number,
      default: 0
    },
  },
});

const bindingSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'Binding',
  },
  metadata,
  target: ref,
});

const csiDriverSchema = Schema({
  apiVersion: {
    type: String,
    default: 'storage.k8s.io/v1',
  },
  kind: {
    type: String,
    default: 'CSIDriver',
  },
  metadata,
  spec: {
    attachRequired: Boolean,
    fsGroupPolicy: String,
    podInfoOnMount: Boolean,
    requiresRepublish: Boolean,
    seLinuxMount: Boolean,
    storageCapacity: Boolean,
    tokenRequests: [{
      audience: String,
      expirationSeconds: {
        type: Number,
        default: 0
      },
    }],
    volumeLifecycleModes: [String],
  },
});

const csiNodeSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'CSINode',
  },
  metadata,
  spec: {
    drivers: [{
      allocatable: {
        count: {
          type: Number,
          default: 0
        },
      },
      name: String,
      nodeID: String,
      topologyKeys: [String],
    }],
  },
});

const csiStorageCapacitySchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  capacity: String,
  kind: {
    type: String,
    default: 'CSIStorageCapacity',
  },
  maximumVolumeSize: String,
  metadata,
  nodeTopology: labelSelector,
  storageClassName: String,
});

const componentStatusSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'ComponentStatus',
  },
  conditions: [{
    error: String,
    message: String,
    status: String,
    type: String,
  }],
  metadata,
});

const controllerRevisionSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'ControllerRevision',
  },
  metadata,
  revision: {
    type: Number,
    default: 0
  },
});

const jobSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'Job',
  },
  metadata,
  spec: jobInfo,
  status: {
    active: {
      type: Number,
      default: 0
    },
    completedIndexes: String,
    completionTime: {
      type: String,
      default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
    },
    conditions: [statusConditions],
    failed: {
      type: Number,
      default: 0
    },
    ready: {
      type: Number,
      default: 0
    },
    startTime: {
      type: String,
      default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
    },
    succeeded: {
      type: Number,
      default: 0
    },
    uncountedTerminatedPods: {
      failed: [String],
      succeeded: [String],
    },
  },
});

const cronJobSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'CronJob',
  },
  metadata,
  spec: {
    concurrencyPolicy: String,
    failedJobsHistoryLimit: {
      type: Number,
      default: 0
    },
    jobTemplate: jobInfo,
    schedule: String,
    startingDeadlineSeconds: {
      type: Number,
      default: 0
    },
    successfulJobsHistoryLimit: {
      type: Number,
      default: 0
    },
    suspend: Boolean,
    timeZone: String,
  },
  status: {
    active: [ref],
    lastScheduleTime: {
      type: String,
      default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
    },
    lastSuccessfulTime: {
      type: String,
      default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
    },
  },
});

// const customResourceDefinitionSchema = Schema({
//   apiVersion: {
//     type: String,
//     default: 'v1',
//   },
//   kind: {
//     type: String,
//     default: 'CustomResourceDefinition',
//   },
//   metadata,
//   spec: {
//     conversion: {
//       strategy: String,
//       webhook: {
//         clientConfig: {
//           caBundle: String,
//           service: {
//             name: String,
//             namespace: String,
//             path: String,
//             port: { type: Number, default: 0 },
//           },
//           url: String,
//         },
//         conversionReviewVersions: [String],
//       },
//     },
//     group: String,
//     names: {
//       categories: [String],
//       kind: String,
//       listKind: String,
//       plural: String,
//       shortNames: [String],
//       singular: String,
//     },
//     preserveUnknownFields: Boolean,
//     scope: String,
//     versions: [{
//       additionalPrinterColumns: [{
//         description: String,
//         format: String,
//         jsonPath: String,
//         name: String,
//         priority: { type: Number, default: 0 },
//         type: String,
//       }],
//       deprecated: Boolean,
//       deprecationWarning: String,
//       name: String,
//       schema: {
//         openAPIV3Schema: {
//           $ref: String,
//           $schema: String,
//           additionalItems: Object,
//           additionalProperties: Object,
//           allOf: [Object],
//           anyOf: [Object],
//           default: Object,
//           definitions: {
//             type: Map,
//             of: String,
//           },
//           dependencies: {
//             type: Map,
//             of: String,
//           },
//           description: String,
//           enum: [Object],
//           example: Object,
//           exclusiveMaximum: Boolean,
//           exclusiveMinimum: Boolean,
//           externalDocs: {
//             description: String,
//             url: String,
//           },
//           format: String,
//           id: String,
//           items: Object,
//           maxItems: { type: Number, default: 0 },
//           maxLength: { type: Number, default: 0 },
//           maxProperties: { type: Number, default: 0 },
//           maximum: { type: Number, default: 0 },
//           minItems: { type: Number, default: 0 },
//           minLength: { type: Number, default: 0 },
//           minProperties: { type: Number, default: 0 },
//           minimum: { type: Number, default: 0 },
//           multipleOf: { type: Number, default: 0 },
//           not: Object,
//           nullable: Boolean,
//           oneOf: [Object],
//           pattern: String,
//           patternProperties: {
//             type: Map,
//             of: String,
//           },
//           properties: {
//             type: Map,
//             of: String,
//           },
//           required: [String],
//           title: String,
//           type: String,
//           uniqueItems: Boolean,
//           'x-kubernetes-embedded-resource': Boolean,
//           'x-kubernetes-int-or-string': Boolean,
//           'x-kubernetes-list-map-keys': [String],
//           'x-kubernetes-list-type': String,
//           'x-kubernetes-map-type': String,
//           'x-kubernetes-preserve-unknown-fields': Boolean,
//           'x-kubernetes-validations': [{
//             message: String,
//             messageExpression: String,
//             rule: String,
//           }],
//         },
//       },
//       served: Boolean,
//       storage: Boolean,
//       subresources: {
//         scale: {
//           labelSelectorPath: String,
//           specReplicasPath: String,
//           statusReplicasPath: String,
//         },
//       },
//     }],
//   },
//   status: {
//     acceptedNames: {
//       categories: [String],
//       kind: String,
//       listKind: String,
//       plural: String,
//       shortNames: [String],
//       singular: String,
//     },
//     conditions: [statusConditions],
//     storedVersions: [String],
//   },
// });

const endpointSliceSchema = Schema({
  addressType: String,
  apiVersion: {
    type: String,
    default: 'v1',
  },
  endpoints: [{
    addresses: [String],
    conditions: {
      ready: Boolean,
      serving: Boolean,
      terminating: Boolean,
    },
    deprecatedTopology: {
      type: Map,
      of: String,
    },
    hints: {
      forZones: [{
        name: String,
      }],
    },
    hostname: String,
    nodeName: String,
    targetRef: ref,
    zone: String,
  }],
  kind: {
    type: String,
    default: 'EndpointSlice',
  },
  metadata,
  ports: [{
    appProtocol: String,
    name: String,
    port: {
      type: Number,
      default: 0
    },
    protocol: String,
  }],
});

const horizontalPodAutoscalerSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'HorizontalPodAutoscaler',
  },
  metadata,
  spec: {
    behavior: {
      scaleDown: {
        policies: [{
          periodSeconds: {
            type: Number,
            default: 0
          },
          type: String,
          value: {
            type: Number,
            default: 0
          },
        }],
        selectPolicy: String,
        stabilizationWindowSeconds: {
          type: Number,
          default: 0
        },
      },
      scaleUp: {
        policies: [{
          periodSeconds: {
            type: Number,
            default: 0
          },
          type: String,
          value: {
            type: Number,
            default: 0
          },
        }],
        selectPolicy: String,
        stabilizationWindowSeconds: {
          type: Number,
          default: 0
        },
      },
    },
    maxReplicas: {
      type: Number,
      default: 0
    },
    metrics: [metrics],
    minReplicas: {
      type: Number,
      default: 0
    },
    scaleTargetRef: {
      apiVersion: String,
      kind: String,
      name: String,
    },
  },
  status: {
    conditions: [statusConditions],
    currentMetrics: [metrics],
    currentReplicas: {
      type: Number,
      default: 0
    },
    desiredReplicas: {
      type: Number,
      default: 0
    },
    lastScaleTime: {
      type: String,
      default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
    },
    observedGeneration: {
      type: Number,
      default: 0
    },
  },
});

const ingressClassSchema = Schema({
  apiVersion: {
    type: String,
    default: 'networking.k8s.io/v1',
  },
  kind: {
    type: String,
    default: 'IngressClass',
  },
  metadata,
  spec: {
    controller: String,
    parameters: {
      apiGroup: String,
      kind: String,
      name: String,
      namespace: String,
      scope: String,
    },
  },
});

const leaseSchema = Schema({
  apiVersion: {
    type: String,
    default: 'coordination.k8s.io/v1',
  },
  kind: {
    type: String,
    default: 'Lease',
  },
  metadata,
  spec: {
    acquireTime: {
      type: String,
      default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
    },
    holderIdentity: String,
    leaseDurationSeconds: {
      type: Number,
      default: 0
    },
    leaseTransitions: {
      type: Number,
      default: 0
    },
    renewTime: {
      type: String,
      default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
    },
  },
});

const limitRangeSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'LimitRange',
  },
  metadata,
  spec: {
    limits: [{
      default: {
        type: Map,
        of: String,
      },
      defaultRequest: {
        type: Map,
        of: String,
      },
      max: {
        type: Map,
        of: String,
      },
      maxLimitRequestRatio: {
        type: Map,
        of: String,
      },
      min: {
        type: Map,
        of: String,
      },
      type: String,
    }],
  },
});

const localSubjectAccessReviewSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'LocalSubjectAccessReview',
  },
  metadata,
  spec: {
    extra: [String],
    groups: [String],
    nonResourceAttributes: {
      path: String,
      verb: String,
    },
    resourceAttributes: {
      group: String,
      name: String,
      namespace: String,
      resource: String,
      subresource: String,
      verb: String,
      version: String,
    },
    uid: {
      type: String,
      default: uuid()
    },
    user: String,
  },
  status: {
    allowed: Boolean,
    denied: Boolean,
    evaluationError: String,
    reason: String,
  },
});

const mutatingWebhookConfigurationSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'MutatingWebhookConfiguration',
  },
  metadata,
  webhooks: [{
    admissionReviewVersions: [String],
    clientConfig: {
      caBundle: String,
      service: {
        name: String,
        namespace: String,
        path: String,
        port: {
          type: Number,
          default: 0
        },
      },
      url: String,
    },
    failurePolicy: String,
    matchConditions: [{
      expression: String,
      name: String,
    }],
    matchPolicy: String,
    name: String,
    namespaceSelector: labelSelector,
    objectSelector: labelSelector,
    reinvocationPolicy: String,
    rules: [{
      apiGroups: [String],
      apiVersions: [String],
      operations: [String],
      resources: [String],
      scope: String,
    }],
    sideEffects: String,
    timeoutSeconds: {
      type: Number,
      default: 0
    },
  }],
});

const networkPolicySchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'NetworkPolicy',
  },
  metadata,
  spec: {
    egress: [{
      ports: [{
        endPort: {
          type: Number,
          default: 0
        },
        port: String,
        protocol: String,
      }],
      to: [{
        ipBlock: {
          cidr: String,
          except: [String],
        },
        namespaceSelector: labelSelector,
        podSelector: labelSelector,
      }],
    }],
    ingress: [{
      from: [{
        ipBlock: {
          cidr: String,
          except: [String],
        },
        namespaceSelector: labelSelector,
        podSelector: labelSelector,
      }],
      ports: [{
        endPort: {
          type: Number,
          default: 0
        },
        port: String,
        protocol: String,
      }],
    }],
    podSelector: labelSelector,
    policyTypes: [String],
  },
  status: {
    conditions: [statusConditions],
  },
});

const persistentVolumeSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'PersistentVolume',
  },
  metadata,
  spec: {
    ...volumeInfo,
    accessModes: [String],
    azureFile: {
      ...volumeInfo.azureFile,
      secretNamespace: String,
    },
    capacity: {
      type: Map,
      of: String,
    },
    cephfs: {
      ...volumeInfo.cephfs,
      secretRef: {
        ...volumeInfo.cephfs.secretRef,
        namespace: String,
      },
    },
    cinder: {
      ...volumeInfo.cinder,
      secretRef: {
        ...volumeInfo.cinder.secretRef,
        namespace: String,
      },
    },
    claimRef: ref,
    csi: {
      ...volumeInfo.csi,
      controllerExpandSecretRef: {
        name: String,
        namespace: String,
      },
      controllerPublishSecretRef: {
        name: String,
        namespace: String,
      },
      nodeExpandSecretRef: {
        name: String,
        namespace: String,
      },
      nodePublishSecretRef: {
        ...volumeInfo.csi.nodePublishSecretRef,
        namespace: String,
      },
      nodeStageSecretRef: {
        name: String,
        namespace: String,
      },
      volumeHandle: String,
    },
    flexVolume: {
      ...volumeInfo.flexVolume,
      secretRef: {
        ...volumeInfo.flexVolume.secretRef,
        namespace: String,
      },
    },
    glusterfs: {
      ...glusterfs,
      endpointsNamespace: String,
    },
    local: {
      fsType: String,
      path: String,
    },
    mountOptions: [String],
    nodeAffinity,
    persistentVolumeReclaimPolicy: String,
    scaleIO: {
      ...volumeInfo.scaleIO,
      secretRef: {
        ...volumeInfo.scaleIO.secretRef,
        namespace: String,
      },
    },
    storageClassName: String,
    storageos: {
      ...volumeInfo.storageos,
      secretRef: ref,
    },
    volumeMode: String,
  },
  status: {
    message: String,
    phase: String,
    reason: String,
  },
});

const podDisruptionBudgetSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'PodDisruptionBudget',
  },
  metadata,
  spec: {
    maxUnavailable: String,
    minAvailable: String,
    selector: labelSelector,
    unhealthyPodEvictionPolicy: String,
  },
  status: {
    conditions: [{
      ...statusConditions,
      observedGeneration: {
        type: Number,
        default: 0
      },
    }],
    currentHealthy: {
      type: Number,
      default: 0
    },
    desiredHealthy: {
      type: Number,
      default: 0
    },
    disruptedPods: {
      type: Map,
      of: String,
    },
    disruptionsAllowed: {
      type: Number,
      default: 0
    },
    expectedPods: {
      type: Number,
      default: 0
    },
    observedGeneration: {
      type: Number,
      default: 0
    },
  },
});

const priorityClassSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  description: String,
  globalDefault: Boolean,
  kind: {
    type: String,
    default: 'PriorityClass',
  },
  metadata,
  preemptionPolicy: String,
  value: {
    type: Number,
    default: 0
  },
});

const resourceQuotaSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'ResourceQuota',
  },
  metadata,
  spec: {
    hard: {
      type: Map,
      of: String,
    },
    scopeSelector: {
      matchExpressions: [{
        operator: String,
        scopeName: String,
        values: [String],
      }],
    },
    scopes: [String],
  },
  status: {
    hard: {
      type: Map,
      of: String,
    },
    used: {
      type: Map,
      of: String,
    },
  },
});

const runtimeClassSchema = Schema({
  apiVersion: {
    type: String,
    default: 'node.k8s.io/v1',
  },
  kind: {
    type: String,
    default: 'RuntimeClass',
  },
  handler: String,
  metadata,
  overhead: {
    podFixed: {
      type: Map,
      of: String,
    },
  },
  scheduling: {
    nodeSelector: {
      type: Map,
      of: String,
    },
    tolerations: [{
      effect: String,
      key: String,
      operator: String,
      tolerationSeconds: {
        type: Number,
        default: 0
      },
      value: String,
    }],
  },
});

const selfSubjectAccessReviewSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'SelfSubjectAccessReview',
  },
  metadata,
  spec: {
    nonResourceAttributes: {
      path: String,
      verb: String,
    },
    resourceAttributes: {
      group: String,
      name: String,
      namespace: String,
      resource: String,
      subresource: String,
      verb: String,
      version: String,
    },
  },
  status: {
    allowed: Boolean,
    denied: Boolean,
    evaluationError: String,
    reason: String,
  },
});

const selfSubjectReviewSchema = Schema({
  apiVersion: {
    type: String,
    default: 'authentication.k8s.io/v1',
  },
  kind: {
    type: String,
    default: 'SelfSubjectReview',
  },
  metadata,
  status: {
    userInfo: {
      extra: [{
        type: Map,
        of: [String],
      }],
      groups: [String],
      uid: {
        type: String,
        default: uuid()
      },
      username: String,
    }
  }
});

const selfSubjectRulesReviewSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'SelfSubjectRulesReview',
  },
  metadata,
  spec: {
    namespace: String,
  },
  status: {
    evaluationError: String,
    incomplete: Boolean,
    nonResourceRules: [{
      nonResourceURLs: [String],
      verbs: [String],
    }],
    resourceRules: [{
      apiGroups: [String],
      resourceNames: [String],
      resources: [String],
      verbs: [String],
    }],
  },
});

const serviceAccountSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'ServiceAccount',
  },
  metadata,
  spec: {
    automountServiceAccountToken: Boolean,
    imagePullSecrets: [{
      name: String,
    }],
    secrets: [ref],
  },
})

const statefulSetSchema = Schema({
  apiVersion: {
    type: String,
    default: 'apps/v1',
  },
  kind: {
    type: String,
    default: 'StatefulSet',
  },
  metadata,
  spec: {
    minReadySeconds: {
      type: Number,
      default: 0
    },
    ordinals: {
      start: {
        type: Number,
        default: 0
      },
    },
    persistentVolumeClaimRetentionPolicy: {
      whenDeleted: String,
      whenScaled: String,
    },
    podManagementPolicy: String,
    replicas: {
      type: Number,
      default: 0
    },
    revisionHistoryLimit: {
      type: Number,
      default: 0
    },
    selector: labelSelector,
    serviceName: String,
    template: pod,
    updateStrategy: {
      rollingUpdate: {
        maxUnavailable: String,
        partition: {
          type: Number,
          default: 0
        },
      },
      type: String,
    },
    volumeClaimTemplates: [persistentVolumeClaimSchema],
  },
  status: {
    availableReplicas: {
      type: Number,
      default: 0
    },
    collisionCount: {
      type: Number,
      default: 0
    },
    conditions: [statusConditions],
    currentReplicas: {
      type: Number,
      default: 0
    },
    currentRevision: String,
    observedGeneration: {
      type: Number,
      default: 0
    },
    readyReplicas: {
      type: Number,
      default: 0
    },
    replicas: {
      type: Number,
      default: 0
    },
    updateRevision: String,
    updatedReplicas: {
      type: Number,
      default: 0
    },
  },
});

const storageClassSchema = Schema({
  apiVersion: {
    type: String,
    default: 'storage.k8s.io/v1',
  },
  kind: {
    type: String,
    default: 'StorageClass',
  },
  metadata,
  allowVolumeExpansion: Boolean,
  allowedTopologies: [{
    matchLabelExpressions: [{
      key: String,
      values: [String],
    }],
  }],
  mountOptions: [String],
  parameters: {
    type: Map,
    of: String,
  },
  provisioner: String,
  reclaimPolicy: String,
  volumeBindingMode: String,
});

const subjectAccessReviewSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'SubjectAccessReview',
  },
  metadata,
  spec: {
    extra: [String],
    groups: [String],
    nonResourceAttributes: {
      path: String,
      verb: String,
    },
    resourceAttributes: {
      group: String,
      name: String,
      namespace: String,
      resource: String,
      subresource: String,
      verb: String,
      version: String,
    },
    uid: {
      type: String,
      default: uuid()
    },
    user: String,
  },
  status: {
    allowed: Boolean,
    denied: Boolean,
    evaluationError: String,
    reason: String,
  },
});

const tokenRequestSchema = Schema({
  apiVersion: {
    type: String,
    default: 'authentication.k8s.io/v1',
  },
  kind: {
    type: String,
    default: 'TokenRequest',
  },
  metadata,
  spec: {
    audiences: {
      type: [String],
      required: true,
    },
    boundObjectRef: {
      apiVersion: String,
      kind: {
        type: String,
        enum: ['Pod', 'Secret']
      },
      name: String,
      uid: {
        type: String,
        default: uuid()
      },
    },
    expirationSeconds: Number
  },
  status: {
    expirationTimestamp: {
      type: [String],
      required: true,
    },
    token: {
      type: [String],
      required: true,
    }
  }
});

const tokenReviewSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'TokenReview',
  },
  metadata,
  spec: {
    audiences: [String],
    token: String,
  },
  status: {
    audiences: [String],
    authenticated: Boolean,
    error: String,
    user: {
      extra: [String],
      groups: [String],
      uid: {
        type: String,
        default: uuid()
      },
      username: String,
    },
  },
});

const validatingWebhookConfigurationSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'ValidatingWebhookConfiguration',
  },
  metadata,
  webhooks: [{
    admissionReviewVersions: [String],
    clientConfig: {
      caBundle: String,
      service: {
        name: String,
        namespace: String,
        path: String,
        port: {
          type: Number,
          default: 0
        },
      },
      url: String,
    },
    failurePolicy: String,
    matchConditions: [{
      expression: String,
      name: String,
    }],
    matchPolicy: String,
    name: String,
    namespaceSelector: labelSelector,
    objectSelector: labelSelector,
    rules: [{
      apiGroups: [String],
      apiVersions: [String],
      operations: [String],
      resources: [String],
      scope: String,
    }],
    sideEffects: String,
    timeoutSeconds: {
      type: Number,
      default: 0
    },
  }],
});

const volumeAttachmentSchema = Schema({
  apiVersion: {
    type: String,
    default: 'v1',
  },
  kind: {
    type: String,
    default: 'VolumeAttachment',
  },
  metadata,
  spec: {
    attacher: String,
    nodeName: String,
    source: {
      inlineVolumeSpec: persistentVolumeSchema,
      persistentVolumeName: String,
    },
  },
  status: {
    attachError: {
      message: String,
      time: {
        type: String,
        default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
      },
    },
    attached: Boolean,
    attachmentMetadata: {
      type: Map,
      of: String,
    },
    detachError: {
      message: String,
      time: {
        type: String,
        default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")
      },
    },
  },
});

module.exports = {
  APIService: model('APIService', apiServiceSchema),
  Binding: model('Binding', bindingSchema),
  CertificateSigningRequest: model('CertificateSigningRequest', certificateSigningRequestSchema),
  ClusterRole: model('ClusterRole', clusterRoleSchema),
  ClusterRoleBinding: model('ClusterRoleBinding', clusterRoleBindingSchema),
  ComponentStatus: model('ComponentStatus', componentStatusSchema),
  ConfigMap: model('ConfigMap', configMapSchema),
  ControllerRevision: model('ControllerRevision', controllerRevisionSchema),
  CronJob: model('CronJob', cronJobSchema),
  CSIDriver: model('CSIDriver', csiDriverSchema),
  CSINode: model('CSINode', csiNodeSchema),
  CSIStorageCapacity: model('CSIStorageCapacity', csiStorageCapacitySchema),
  // CustomResourceDefinition: model('CustomResourceDefinition', customResourceDefinitionSchema),
  DaemonSet: model('DaemonSet', daemonSetSchema),
  Deployment: model('Deployment', deploymentSchema),
  Endpoints: model('Endpoints', endpointsSchema),
  EndpointSlice: model('EndpointSlice', endpointSliceSchema),
  Event: model('Event', eventSchema),
  HorizontalPodAutoscaler: model('HorizontalPodAutoscaler', horizontalPodAutoscalerSchema),
  HorizontalPodAutoscaler: model('HorizontalPodAutoscaler', horizontalPodAutoscalerSchema),
  IngressClass: model('IngressClass', ingressClassSchema),
  Job: model('Job', jobSchema),
  Lease: model('Lease', leaseSchema),
  LimitRange: model('LimitRange', limitRangeSchema),
  LocalSubjectAccessReview: model('LocalSubjectAccessReview', localSubjectAccessReviewSchema),
  MutatingWebhookConfiguration: model('MutatingWebhookConfiguration', mutatingWebhookConfigurationSchema),
  Namespace: model('Namespace', namespaceSchema),
  NetworkPolicy: model('NetworkPolicy', networkPolicySchema),
  Node: model('Node', nodeSchema),
  PersistentVolume: model('PersistentVolume', persistentVolumeSchema),
  PersistentVolumeClaim: model('PersistentVolumeClaim', persistentVolumeClaimSchema),
  Pod: model('Pod', podSchema),
  PodDisruptionBudget: model('PodDisruptionBudget', podDisruptionBudgetSchema),
  PodTemplate: model('PodTemplate', podTemplateSchema),
  PriorityClass: model('PriorityClass', priorityClassSchema),
  ReplicaSet: model('ReplicaSet', replicaSetSchema),
  ReplicationController: model('ReplicationController', replicationControllerSchema),
  ResourceQuota: model('ResourceQuota', resourceQuotaSchema),
  Role: model('Role', roleSchema),
  RoleBinding: model('RoleBinding', roleBindingSchema),
  RuntimeClass: model('RuntimeClass', runtimeClassSchema),
  Secret: model('Secret', secretSchema),
  SelfSubjectAccessReview: model('SelfSubjectAccessReview', selfSubjectAccessReviewSchema),
  SelfSubjectReview: model('SelfSubjectReview', selfSubjectReviewSchema),
  SelfSubjectRulesReview: model('SelfSubjectRulesReview', selfSubjectRulesReviewSchema),
  Service: model('Service', serviceSchema),
  ServiceAccount: model('ServiceAccount', serviceAccountSchema),
  StatefulSet: model('StatefulSet', statefulSetSchema),
  StorageClass: model('StorageClass', storageClassSchema),
  SubjectAccessReview: model('SubjectAccessReview', subjectAccessReviewSchema),
  TokenRequest: model('TokenRequest', tokenRequestSchema),
  TokenReview: model('TokenReview', tokenReviewSchema),
  ValidatingWebhookConfiguration: model('ValidatingWebhookConfiguration', validatingWebhookConfigurationSchema),
  Volume: model('Volume', volumeSchema),
  VolumeAttachment: model('VolumeAttachment', volumeAttachmentSchema),
  DNS: model('DNS', dns),
};
