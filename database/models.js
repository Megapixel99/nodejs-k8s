const { Schema, model } = require('mongoose');
const { DateTime } = require('luxon');
const { v4: uuid } = require('uuid');

const metadata = {
  creationTimestamp: { type: String, default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "") },
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
  managedFields: [{
    apiVersion: String,
    fieldsType: String,
    fieldsV1: String,
    manager: String,
    operation: String,
    subresource: String,
    time: String,
  }],
  ownerReferences: [{
    apiVersion: String,
    blockOwnerDeletion: Boolean,
    controller: Boolean,
    kind: String,
    name: String,
    uid: String,
  }],
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
  command: [ String ],
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
   activeDeadlineSeconds: Number,
   affinity: {
     nodeAffinity: {
       preferredDuringSchedulingIgnoredDuringExecution: [{
         preference: {
           matchExpressions: [{
             key: String,
             operator: String,
             values: [ String ],
           }],
           matchFields: [{
             key: String,
             operator: String,
             values: [ String ],
           }],
           },
         weight: Number,
       }],
       requiredDuringSchedulingIgnoredDuringExecution: {
         nodeSelectorTerms: [{
           matchExpressions: [{
             key: String,
             operator: String,
             values: [ String ],
           }],
           matchFields: [{
             key: String,
             operator: String,
             values: [ String ],
           }],
         }],
         },
       },
     podAffinity: {
       preferredDuringSchedulingIgnoredDuringExecution: [{
         podAffinityTerm: {
           labelSelector: {
             matchExpressions: [{
               key: String,
               operator: String,
               values: [ String ],
             }],
             matchLabels: {
               type: Map,
               of: String,
             },
             },
           namespaceSelector: {
             matchExpressions: [{
               key: String,
               operator: String,
               values: [ String ],
             }],
             matchLabels: {
               type: Map,
               of: String,
             },
             },
           namespaces: [ String ],
           topologyKey: String,
           },
         weight: Number,
       }],
       requiredDuringSchedulingIgnoredDuringExecution: [{
         labelSelector: {
           matchExpressions: [{
             key: String,
             operator: String,
             values: [ String ],
           }],
           matchLabels: {
             type: Map,
             of: String,
           },
           },
         namespaceSelector: {
           matchExpressions: [{
             key: String,
             operator: String,
             values: [ String ],
           }],
           matchLabels: {
             type: Map,
             of: String,
           },
           },
         namespaces: [ String ],
         topologyKey: String,
       }],
       },
     podAntiAffinity: {
       preferredDuringSchedulingIgnoredDuringExecution: [{
         podAffinityTerm: {
           labelSelector: {
             matchExpressions: [{
               key: String,
               operator: String,
               values: [ String ],
             }],
             matchLabels: {
               type: Map,
               of: String,
             },
             },
           namespaceSelector: {
             matchExpressions: [{
               key: String,
               operator: String,
               values: [ String ],
             }],
             matchLabels: {
               type: Map,
               of: String,
             },
             },
           namespaces: [ String ],
           topologyKey: String,
           },
         weight: Number,
       }],
       requiredDuringSchedulingIgnoredDuringExecution: [{
         labelSelector: {
           matchExpressions: [{
             key: String,
             operator: String,
             values: [ String ],
           }],
           matchLabels: {
             type: Map,
             of: String,
           },
           },
         namespaceSelector: {
           matchExpressions: [{
             key: String,
             operator: String,
             values: [ String ],
           }],
           matchLabels: {
             type: Map,
             of: String,
           },
           },
         namespaces: [ String ],
         topologyKey: String,
       }],
       },
     },
   automountServiceAccountToken: Boolean,
   containers: [{
     args: [ String ],
     command: [ String ],
     env: [{
       name: String,
       value: String,
       valueFrom: {
         configMapKeyRef: {
           key: String,
           name: String,
           optional: Boolean,
           },
         fieldRef: {
           apiVersion: String,
           fieldPath: String,
           },
         resourceFieldRef: {
           containerName: String,
           divisor: String,
           resource: String,
           },
         secretKeyRef: {
           key: String,
           name: String,
           optional: Boolean,
           },
         },
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
         },
     }],
     image: String,
     imagePullPolicy: String,
     lifecycle: {
       postStart: {
         exec: {
           command: [ String ],
           },
         httpGet: {
           host: String,
           httpHeaders: [{
             name: String,
             value: String,
           }],
           path: String,
           port: String,
           scheme: String,
           },
         tcpSocket: {
           host: String,
           port: String,
           },
         },
       preStop: {
         exec: {
           command: [ String ],
           },
         httpGet: {
           host: String,
           httpHeaders: [{
             name: String,
             value: String,
           }],
           path: String,
           port: String,
           scheme: String,
           },
         tcpSocket: {
           host: String,
           port: String,
           },
         },
       },
     livenessProbe: {
       exec: {
         command: [ String ],
         },
       failureThreshold: Number,
       grpc: {
         port: Number,
         service: String,
         },
       httpGet: {
         host: String,
         httpHeaders: [{
           name: String,
           value: String,
         }],
         path: String,
         port: String,
         scheme: String,
         },
       initialDelaySeconds: Number,
       periodSeconds: Number,
       successThreshold: Number,
       tcpSocket: {
         host: String,
         port: String,
         },
       terminationGracePeriodSeconds: Number,
       timeoutSeconds: Number,
       },
     name: String,
     ports: [{
       containerPort: Number,
       hostIP: String,
       hostPort: Number,
       name: String,
       protocol: String,
     }],
     readinessProbe: {
       exec: {
         command: [ String ],
         },
       failureThreshold: Number,
       grpc: {
         port: Number,
         service: String,
         },
       httpGet: {
         host: String,
         httpHeaders: [{
           name: String,
           value: String,
         }],
         path: String,
         port: String,
         scheme: String,
         },
       initialDelaySeconds: Number,
       periodSeconds: Number,
       successThreshold: Number,
       tcpSocket: {
         host: String,
         port: String,
         },
       terminationGracePeriodSeconds: Number,
       timeoutSeconds: Number,
       },
     resizePolicy: [{
       resourceName: String,
       restartPolicy: String,
     }],
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
     securityContext: {
       allowPrivilegeEscalation: Boolean,
       capabilities: {
         add: [ String ],
         drop: [ String ],
         },
       privileged: Boolean,
       procMount: String,
       readOnlyRootFilesystem: Boolean,
       runAsGroup: Number,
       runAsNonRoot: Boolean,
       runAsUser: Number,
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
       windowsOptions: {
         gmsaCredentialSpec: String,
         gmsaCredentialSpecName: String,
         hostProcess: Boolean,
         runAsUserName: String,
         },
       },
     startupProbe: {
       exec: {
         command: [ String ],
         },
       failureThreshold: Number,
       grpc: {
         port: Number,
         service: String,
         },
       httpGet: {
         host: String,
         httpHeaders: [{
           name: String,
           value: String,
         }],
         path: String,
         port: String,
         scheme: String,
         },
       initialDelaySeconds: Number,
       periodSeconds: Number,
       successThreshold: Number,
       tcpSocket: {
         host: String,
         port: String,
         },
       terminationGracePeriodSeconds: Number,
       timeoutSeconds: Number,
       },
     stdin: Boolean,
     stdinOnce: Boolean,
     terminationMessagePath: String,
     terminationMessagePolicy: String,
     tty: Boolean,
     volumeDevices: [{
       devicePath: String,
       name: String,
     }],
     volumeMounts: [{
       mountPath: String,
       mountPropagation: String,
       name: String,
       readOnly: Boolean,
       subPath: String,
       subPathExpr: String,
     }],
     workingDir: String,
   }],
   dnsConfig: {
     nameservers: [ String ],
     options: [{
       name: String,
       value: String,
     }],
     searches: [ String ],
     },
   dnsPolicy: String,
   enableServiceLinks: Boolean,
   ephemeralContainers: [{
     args: [ String ],
     command: [ String ],
     env: [{
       name: String,
       value: String,
       valueFrom: {
         configMapKeyRef: {
           key: String,
           name: String,
           optional: Boolean,
           },
         fieldRef: {
           apiVersion: String,
           fieldPath: String,
           },
         resourceFieldRef: {
           containerName: String,
           divisor: String,
           resource: String,
           },
         secretKeyRef: {
           key: String,
           name: String,
           optional: Boolean,
           },
         },
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
         },
     }],
     image: String,
     imagePullPolicy: String,
     lifecycle: {
       postStart: {
         exec: {
           command: [ String ],
           },
         httpGet: {
           host: String,
           httpHeaders: [{
             name: String,
             value: String,
           }],
           path: String,
           port: String,
           scheme: String,
           },
         tcpSocket: {
           host: String,
           port: String,
           },
         },
       preStop: {
         exec: {
           command: [ String ],
           },
         httpGet: {
           host: String,
           httpHeaders: [{
             name: String,
             value: String,
           }],
           path: String,
           port: String,
           scheme: String,
           },
         tcpSocket: {
           host: String,
           port: String,
           },
         },
       },
     livenessProbe: {
       exec: {
         command: [ String ],
         },
       failureThreshold: Number,
       grpc: {
         port: Number,
         service: String,
         },
       httpGet: {
         host: String,
         httpHeaders: [{
           name: String,
           value: String,
         }],
         path: String,
         port: String,
         scheme: String,
         },
       initialDelaySeconds: Number,
       periodSeconds: Number,
       successThreshold: Number,
       tcpSocket: {
         host: String,
         port: String,
         },
       terminationGracePeriodSeconds: Number,
       timeoutSeconds: Number,
       },
     name: String,
     ports: [{
       containerPort: Number,
       hostIP: String,
       hostPort: Number,
       name: String,
       protocol: String,
     }],
     readinessProbe: {
       exec: {
         command: [ String ],
         },
       failureThreshold: Number,
       grpc: {
         port: Number,
         service: String,
         },
       httpGet: {
         host: String,
         httpHeaders: [{
           name: String,
           value: String,
         }],
         path: String,
         port: String,
         scheme: String,
         },
       initialDelaySeconds: Number,
       periodSeconds: Number,
       successThreshold: Number,
       tcpSocket: {
         host: String,
         port: String,
         },
       terminationGracePeriodSeconds: Number,
       timeoutSeconds: Number,
       },
     resizePolicy: [{
       resourceName: String,
       restartPolicy: String,
     }],
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
     securityContext: {
       allowPrivilegeEscalation: Boolean,
       capabilities: {
         add: [ String ],
         drop: [ String ],
         },
       privileged: Boolean,
       procMount: String,
       readOnlyRootFilesystem: Boolean,
       runAsGroup: Number,
       runAsNonRoot: Boolean,
       runAsUser: Number,
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
       windowsOptions: {
         gmsaCredentialSpec: String,
         gmsaCredentialSpecName: String,
         hostProcess: Boolean,
         runAsUserName: String,
         },
       },
     startupProbe: {
       exec: {
         command: [ String ],
         },
       failureThreshold: Number,
       grpc: {
         port: Number,
         service: String,
         },
       httpGet: {
         host: String,
         httpHeaders: [{
           name: String,
           value: String,
         }],
         path: String,
         port: String,
         scheme: String,
         },
       initialDelaySeconds: Number,
       periodSeconds: Number,
       successThreshold: Number,
       tcpSocket: {
         host: String,
         port: String,
         },
       terminationGracePeriodSeconds: Number,
       timeoutSeconds: Number,
       },
     stdin: Boolean,
     stdinOnce: Boolean,
     targetContainerName: String,
     terminationMessagePath: String,
     terminationMessagePolicy: String,
     tty: Boolean,
     volumeDevices: [{
       devicePath: String,
       name: String,
     }],
     volumeMounts: [{
       mountPath: String,
       mountPropagation: String,
       name: String,
       readOnly: Boolean,
       subPath: String,
       subPathExpr: String,
     }],
     workingDir: String,
   }],
   hostAliases: [{
     hostnames: [ String ],
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
   initContainers: [{
     args: [ String ],
     command: [ String ],
     env: [{
       name: String,
       value: String,
       valueFrom: {
         configMapKeyRef: {
           key: String,
           name: String,
           optional: Boolean,
           },
         fieldRef: {
           apiVersion: String,
           fieldPath: String,
           },
         resourceFieldRef: {
           containerName: String,
           divisor: String,
           resource: String,
           },
         secretKeyRef: {
           key: String,
           name: String,
           optional: Boolean,
           },
         },
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
         },
     }],
     image: String,
     imagePullPolicy: String,
     lifecycle: {
       postStart: {
         exec: {
           command: [ String ],
           },
         httpGet: {
           host: String,
           httpHeaders: [{
             name: String,
             value: String,
           }],
           path: String,
           port: String,
           scheme: String,
           },
         tcpSocket: {
           host: String,
           port: String,
           },
         },
       preStop: {
         exec: {
           command: [ String ],
           },
         httpGet: {
           host: String,
           httpHeaders: [{
             name: String,
             value: String,
           }],
           path: String,
           port: String,
           scheme: String,
           },
         tcpSocket: {
           host: String,
           port: String,
           },
         },
       },
     livenessProbe: {
       exec: {
         command: [ String ],
         },
       failureThreshold: Number,
       grpc: {
         port: Number,
         service: String,
         },
       httpGet: {
         host: String,
         httpHeaders: [{
           name: String,
           value: String,
         }],
         path: String,
         port: String,
         scheme: String,
         },
       initialDelaySeconds: Number,
       periodSeconds: Number,
       successThreshold: Number,
       tcpSocket: {
         host: String,
         port: String,
         },
       terminationGracePeriodSeconds: Number,
       timeoutSeconds: Number,
       },
     name: String,
     ports: [{
       containerPort: Number,
       hostIP: String,
       hostPort: Number,
       name: String,
       protocol: String,
     }],
     readinessProbe: {
       exec: {
         command: [ String ],
         },
       failureThreshold: Number,
       grpc: {
         port: Number,
         service: String,
         },
       httpGet: {
         host: String,
         httpHeaders: [{
           name: String,
           value: String,
         }],
         path: String,
         port: String,
         scheme: String,
         },
       initialDelaySeconds: Number,
       periodSeconds: Number,
       successThreshold: Number,
       tcpSocket: {
         host: String,
         port: String,
         },
       terminationGracePeriodSeconds: Number,
       timeoutSeconds: Number,
       },
     resizePolicy: [{
       resourceName: String,
       restartPolicy: String,
     }],
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
     securityContext: {
       allowPrivilegeEscalation: Boolean,
       capabilities: {
         add: [ String ],
         drop: [ String ],
         },
       privileged: Boolean,
       procMount: String,
       readOnlyRootFilesystem: Boolean,
       runAsGroup: Number,
       runAsNonRoot: Boolean,
       runAsUser: Number,
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
       windowsOptions: {
         gmsaCredentialSpec: String,
         gmsaCredentialSpecName: String,
         hostProcess: Boolean,
         runAsUserName: String,
         },
       },
     startupProbe: {
       exec: {
         command: [ String ],
         },
       failureThreshold: Number,
       grpc: {
         port: Number,
         service: String,
         },
       httpGet: {
         host: String,
         httpHeaders: [{
           name: String,
           value: String,
         }],
         path: String,
         port: String,
         scheme: String,
         },
       initialDelaySeconds: Number,
       periodSeconds: Number,
       successThreshold: Number,
       tcpSocket: {
         host: String,
         port: String,
         },
       terminationGracePeriodSeconds: Number,
       timeoutSeconds: Number,
       },
     stdin: Boolean,
     stdinOnce: Boolean,
     terminationMessagePath: String,
     terminationMessagePolicy: String,
     tty: Boolean,
     volumeDevices: [{
       devicePath: String,
       name: String,
     }],
     volumeMounts: [{
       mountPath: String,
       mountPropagation: String,
       name: String,
       readOnly: Boolean,
       subPath: String,
       subPathExpr: String,
     }],
     workingDir: String,
   }],
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
   priority: Number,
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
     fsGroup: Number,
     fsGroupChangePolicy: String,
     runAsGroup: Number,
     runAsNonRoot: Boolean,
     runAsUser: Number,
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
     supplementalGroups: [ Number ],
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
   terminationGracePeriodSeconds: Number,
   tolerations: [{
     effect: String,
     key: String,
     operator: String,
     tolerationSeconds: Number,
     value: String,
   }],
   topologySpreadConstraints: [{
     labelSelector: {
       matchExpressions: [{
         key: String,
         operator: String,
         values: [ String ],
       }],
       matchLabels: {
         type: Map,
         of: String,
       },
       },
     matchLabelKeys: [ String ],
     maxSkew: Number,
     minDomains: Number,
     nodeAffinityPolicy: String,
     nodeTaintsPolicy: String,
     topologyKey: String,
     whenUnsatisfiable: String,
   }],
   volumes: [{
     awsElasticBlockStore: {
       fsType: String,
       partition: Number,
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
       monitors: [ String ],
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
     configMap: {
       defaultMode: Number,
       items: [{
         key: String,
         mode: Number,
         path: String,
       }],
       name: String,
       optional: Boolean,
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
     downwardAPI: {
       defaultMode: Number,
       items: [{
         fieldRef: {
           apiVersion: String,
           fieldPath: String,
           },
         mode: Number,
         path: String,
         resourceFieldRef: {
           containerName: String,
           divisor: String,
           resource: String,
           },
       }],
       },
     emptyDir: {
       medium: String,
       sizeLimit: String,
       },
     ephemeral: {
       volumeClaimTemplate: {
         metadata,
         spec: {
           accessModes: [ String ],
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
           selector: {
             matchExpressions: [{
               key: String,
               operator: String,
               values: [ String ],
             }],
             matchLabels: {
               type: Map,
               of: String,
             },
             },
           storageClassName: String,
           volumeMode: String,
           volumeName: String,
           },
         },
       },
     fc: {
       fsType: String,
       lun: Number,
       readOnly: Boolean,
       targetWWNs: [ String ],
       wwids: [ String ],
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
       partition: Number,
       pdName: String,
       readOnly: Boolean,
       },
     gitRepo: {
       directory: String,
       repository: String,
       revision: String,
       },
     glusterfs: {
       endpoints: String,
       path: String,
       readOnly: Boolean,
       },
     hostPath: {
       path: String,
       type: String,
       },
     iscsi: {
       chapAuthDiscovery: Boolean,
       chapAuthSession: Boolean,
       fsType: String,
       initiatorName: String,
       iqn: String,
       iscsiInterface: String,
       lun: Number,
       portals: [ String ],
       readOnly: Boolean,
       secretRef: {
         name: String,
         },
       targetPortal: String,
       },
     name: String,
     nfs: {
       path: String,
       readOnly: Boolean,
       server: String,
       },
     persistentVolumeClaim: {
       claimName: String,
       readOnly: Boolean,
       },
     photonPersistentDisk: {
       fsType: String,
       pdID: String,
       },
     portworxVolume: {
       fsType: String,
       readOnly: Boolean,
       volumeID: String,
       },
     projected: {
       defaultMode: Number,
       sources: [{
         configMap: {
           items: [{
             key: String,
             mode: Number,
             path: String,
           }],
           name: String,
           optional: Boolean,
           },
         downwardAPI: {
           items: [{
             fieldRef: {
               apiVersion: String,
               fieldPath: String,
               },
             mode: Number,
             path: String,
             resourceFieldRef: {
               containerName: String,
               divisor: String,
               resource: String,
               },
           }],
           },
         secret: {
           items: [{
             key: String,
             mode: Number,
             path: String,
           }],
           name: String,
           optional: Boolean,
           },
         serviceAccountToken: {
           audience: String,
           expirationSeconds: Number,
           path: String,
           },
       }],
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
       monitors: [ String ],
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
     secret: {
       defaultMode: Number,
       items: [{
         key: String,
         mode: Number,
         path: String,
       }],
       optional: Boolean,
       secretName: String,
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
   }],
  },
  status: {
    nominatedNodeName: String,
    phase: {
      type: String,
      enum: [ 'Pending', 'Running', 'Succeeded', 'Failed', 'Unknown' ],
      default: 'Pending'
    },
    conditions: [{
      ...statusConditions,
      lastTransitionTime: { type: String, default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "") }
    }],
    containerStatuses: [{
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
          exitCode: Number,
          finishedAt: String,
          message: String,
          reason: String,
          signal: Number,
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
      restartCount: Number,
      started: Boolean,
      state: {
        running: {
          startedAt: String,
          },
        terminated: {
          containerID: String,
          exitCode: Number,
          finishedAt: String,
          message: String,
          reason: String,
          signal: Number,
          startedAt: String,
          },
        waiting: {
          message: String,
          reason: String,
          },
        },
    }],
    ephemeralContainerStatuses: [{
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
          exitCode: Number,
          finishedAt: String,
          message: String,
          reason: String,
          signal: Number,
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
      restartCount: Number,
      started: Boolean,
      state: {
        running: {
          startedAt: String,
          },
        terminated: {
          containerID: String,
          exitCode: Number,
          finishedAt: String,
          message: String,
          reason: String,
          signal: Number,
          startedAt: String,
          },
        waiting: {
          message: String,
          reason: String,
          },
        },
    }],
    hostIP: String,
    initContainerStatuses: [{
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
          exitCode: Number,
          finishedAt: String,
          message: String,
          reason: String,
          signal: Number,
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
      restartCount: Number,
      started: Boolean,
      state: {
        running: {
          startedAt: String,
          },
        terminated: {
          containerID: String,
          exitCode: Number,
          finishedAt: String,
          message: String,
          reason: String,
          signal: Number,
          startedAt: String,
          },
        waiting: {
          message: String,
          reason: String,
          },
        },
    }],
    message: String,
    podIP: { type: String, default: null },
    podIPs: [{
      ip: String
    }],
    qosClass: String,
    reason: String,
    resize: String,
    startTime: { type: String, default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "") },
  }
}

const podTemplateSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  template: pod
})

const statusConditions = {
  status: {
    type: String,
    enum: [ 'True', 'False', 'Unknown' ],
    default: 'False'
  },
  type: { type: String },
  lastTransitionTime: { type: String, default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "") },
  message: String,
  reason: String,
};

const namespaceSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    finalizers: {
      type: [ String ],
      default: [ 'kubernetes' ]
    },
  },
  status: {
    phase: { type: String, default: 'Active' },
  },
});

const deploymentSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    minReadySeconds: Number,
    paused: Boolean,
    progressDeadlineSeconds: Number,
    replicas: Number,
    revisionHistoryLimit: Number,
    selector: {
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
    availableReplicas: Number,
    collisionCount: Number,
    conditions: [{
      ...statusConditions,
      lastUpdateTime: String,
    }],
    observedGeneration: Number,
    readyReplicas: Number,
    replicas: Number,
    unavailableReplicas: Number,
    updatedReplicas: Number,
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

const serviceAccountSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    automountServiceAccountToken: Boolean,
    imagePullSecrets: [{
      name: String,
    }],
    secrets: [{
      apiVersion: String,
      fieldPath: String,
      kind: String,
      name: String,
      namespace: String,
      resourceVersion: String,
      uid: String,
    }],
  },
})

const nodeSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    configSource: {
      configMap: {
        kubeletConfigKey: String,
        name: String,
        namespace: String,
        resourceVersion: String,
        uid: String,
      },
    },
    externalID: String,
    podCIDR: String,
    podCIDRs: [ String ],
    providerID: String,
    taints: [{
      effect: { type: String },
      key: { type: String },
      timeAdded: { type: String },
      value: { type: String },
    }],
    unschedulable: { type: Boolean, default: false },
  },
  status: {
    addresses: [{
      address: String,
      type: { type: String },
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
      lastHeartbeatTime: { type: String, default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "") },
    }],
    config: {
      active: {
         configMap: {
           kubeletConfigKey: String,
           name: String,
           namespace: String,
           resourceVersion: String,
           uid: String,
         },
       },
     },
      assigned: {
       configMap: {
          kubeletConfigKey: String,
          name: String,
          namespace: String,
          resourceVersion: String,
          uid: String,
        },
      },
      error: String,
      lastKnownGood: {
         configMap: {
            kubeletConfigKey: String,
            name: String,
            namespace: String,
            resourceVersion: String,
            uid: String,
          },
        },
    daemonEndpoints: {
      kubeletEndpoint: {
         Port: Number,
       },
     },
    images: [{
      names: [ String ],
      sizeBytes: Number,
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
    volumesInUse: [ String ],
  },
})

const objectReferenceSchema = Schema({
  kind: String,
  namespace: String,
  name: String,
  uid: String,
  apiVersion: String,
  resourceVersion: String,
  fieldPath: String,
});

const eventSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  action: String,
  deprecatedCount: { type: Number, default: 0 },
  deprecatedFirstTimestamp: { type: String, default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ".000000") },
  deprecatedLastTimestamp: { type: String, default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ".000000") },
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
    count: { type: Number, default: 0 },
    lastObservedTime: { type: String, default: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ".000000") },
  },
  type: { type: String, enum: [ 'Normal', 'Warning' ] },
})

const replicaSetSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    selector: labelSelector,
    template: pod,
    minReadySeconds: { type: Number, default: 0 },
    replicas: { type: Number, default: 1 },
  },
  status: {
    replicas: Number,
    availableReplicas: Number,
    readyReplicas: Number,
    fullyLabeledReplicas: Number,
    conditions: [statusConditions],
    observedGeneration: Number,
  }
})

const daemonSetSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    selector: labelSelector,
    template: pod,
    minReadySeconds: { type: Number, default: 0 },
    updateStrategy: {
      type: { type: String, enum: [ 'RollingUpdate', 'OnDelete' ] },
      rollingUpdate: {
        maxSurge: String,
        maxUnavailable: String,
      }
    },
    revisionHistoryLimit: { type: Number, default: 10 },
  },
  status: {
    numberReadynumberAvailable: Number,
    numberUnavailable: Number,
    numberMisschedule: Number,
    desiredNumberScheduled: Number,
    currentNumberScheduled: Number,
    updatedNumberScheduled: Number,
    collisionCount: Number,
    conditions: [statusConditions],
    observedGeneration: Number,
  }
})

const replicationControllerSchema = Schema({
 apiVersion: String,
 kind: String,
 metadata,
 spec: {
  minReadySeconds: { type: Number, default: 0 },
  replicas: Number,
  selector: labelSelector,
  template: pod,
  },
 status: {
  availableReplicas: { type: Number, default: 0 },
  conditions: [statusConditions],
  fullyLabeledReplicas: { type: Number, default: 0 },
  observedGeneration: { type: Number, default: 0 },
  readyReplicas: { type: Number, default: 0 },
  replicas: { type: Number, default: 0 },
  },
});

const aPIServiceSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    caBundle: String,
    group: String,
    groupPriorityMinimum: Number,
    insecureSkipTLSVerify: Boolean,
    service: {
      name: String,
      namespace: String,
      port: Number,
    },
    version: String,
    versionPriority: Number,
  },
  status: {
    conditions: [statusConditions],
  },
});

const bindingSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  target: {
    apiVersion: String,
    fieldPath: String,
    kind: String,
    name: String,
    namespace: String,
    resourceVersion: String,
    uid: String,
  },
});

const cSIDriverSchema = Schema({
  apiVersion: String,
  kind: String,
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
      expirationSeconds: Number,
    }],
    volumeLifecycleModes: [String],
  },
});

const cSINodeSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    drivers: [{
      allocatable: {
        count: Number,
      },
      name: String,
      nodeID: String,
      topologyKeys: [String],
    }],
  },
});

const cSIStorageCapacitySchema = Schema({
  apiVersion: String,
  capacity: String,
  kind: String,
  maximumVolumeSize: String,
  metadata,
  nodeTopology: {
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
  storageClassName: String,
});

const componentStatusSchema = Schema({
  apiVersion: String,
  conditions: [{
    error: String,
    message: String,
    status: String,
    type: String,
  }],
  kind: String,
  metadata,
});

const controllerRevisionSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  revision: Number,
});

const cronJobSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    concurrencyPolicy: String,
    failedJobsHistoryLimit: Number,
    jobTemplate: {
      metadata,
      spec: {
        activeDeadlineSeconds: Number,
        backoffLimit: Number,
        completionMode: String,
        completions: Number,
        manualSelector: Boolean,
        parallelism: Number,
        podFailurePolicy: {
          rules: [{
            action: String,
            onExitCodes: {
              containerName: String,
              operator: String,
              values: [Number],
            },
            onPodConditions: [{
              status: String,
              type: String,
            }],
          }],
        },
        selector: {
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
        suspend: Boolean,
        template: pod,
        ttlSecondsAfterFinished: Number,
      },
    },
    schedule: String,
    startingDeadlineSeconds: Number,
    successfulJobsHistoryLimit: Number,
    suspend: Boolean,
    timeZone: String,
  },
  status: {
    active: [{
      apiVersion: String,
      fieldPath: String,
      kind: String,
      name: String,
      namespace: String,
      resourceVersion: String,
      uid: String,
    }],
    lastScheduleTime: String,
    lastSuccessfulTime: String,
  },
});

const customResourceDefinitionSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    conversion: {
      strategy: String,
      webhook: {
        clientConfig: {
          caBundle: String,
          service: {
            name: String,
            namespace: String,
            path: String,
            port: Number,
          },
          url: String,
        },
        conversionReviewVersions: [String],
      },
    },
    group: String,
    names: {
      categories: [String],
      kind: String,
      listKind: String,
      plural: String,
      shortNames: [String],
      singular: String,
    },
    preserveUnknownFields: Boolean,
    scope: String,
    versions: [{
      additionalPrinterColumns: [{
        description: String,
        format: String,
        jsonPath: String,
        name: String,
        priority: Number,
        type: String,
      }],
      deprecated: Boolean,
      deprecationWarning: String,
      name: String,
      schema: {
        openAPIV3Schema: {
          $ref: String,
          $schema: String,
          additionalItems: Object,
          additionalProperties: Object,
          allOf: [Object],
          anyOf: [Object],
          default: Object,
          definitions: {
            type: Map,
            of: String,
          },
          dependencies: {
            type: Map,
            of: String,
          },
          description: String,
          enum: [Object],
          example: Object,
          exclusiveMaximum: Boolean,
          exclusiveMinimum: Boolean,
          externalDocs: {
            description: String,
            url: String,
          },
          format: String,
          id: String,
          items: Object,
          maxItems: Number,
          maxLength: Number,
          maxProperties: Number,
          maximum: Number,
          minItems: Number,
          minLength: Number,
          minProperties: Number,
          minimum: Number,
          multipleOf: Number,
          not: Object,
          nullable: Boolean,
          oneOf: [Object],
          pattern: String,
          patternProperties: {
            type: Map,
            of: String,
          },
          properties: {
            type: Map,
            of: String,
          },
          required: [String],
          title: String,
          type: String,
          uniqueItems: Boolean,
          'x-kubernetes-embedded-resource': Boolean,
          'x-kubernetes-int-or-string': Boolean,
          'x-kubernetes-list-map-keys': [String],
          'x-kubernetes-list-type': String,
          'x-kubernetes-map-type': String,
          'x-kubernetes-preserve-unknown-fields': Boolean,
          'x-kubernetes-validations': [{
            message: String,
            messageExpression: String,
            rule: String,
          }],
        },
      },
      served: Boolean,
      storage: Boolean,
      subresources: {
        scale: {
          labelSelectorPath: String,
          specReplicasPath: String,
          statusReplicasPath: String,
        },
      },
    }],
  },
  status: {
    acceptedNames: {
      categories: [String],
      kind: String,
      listKind: String,
      plural: String,
      shortNames: [String],
      singular: String,
    },
    conditions: [statusConditions],
    storedVersions: [String],
  },
});

const endpointSliceSchema = Schema({
  addressType: String,
  apiVersion: String,
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
    targetRef: {
      apiVersion: String,
      fieldPath: String,
      kind: String,
      name: String,
      namespace: String,
      resourceVersion: String,
      uid: String,
    },
    zone: String,
  }],
  kind: String,
  metadata,
  ports: [{
    appProtocol: String,
    name: String,
    port: Number,
    protocol: String,
  }],
});

const endpointsSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  subsets: [{
    addresses: [{
      hostname: String,
      ip: String,
      nodeName: String,
      targetRef: {
        apiVersion: String,
        fieldPath: String,
        kind: String,
        name: String,
        namespace: String,
        resourceVersion: String,
        uid: String,
      },
    }],
    notReadyAddresses: [{
      hostname: String,
      ip: String,
      nodeName: String,
      targetRef: {
        apiVersion: String,
        fieldPath: String,
        kind: String,
        name: String,
        namespace: String,
        resourceVersion: String,
        uid: String,
      },
    }],
    ports: [{
      appProtocol: String,
      name: String,
      port: Number,
      protocol: String,
    }],
  }],
});

const horizontalPodAutoscalerSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    behavior: {
      scaleDown: {
        policies: [{
          periodSeconds: Number,
          type: String,
          value: Number,
        }],
        selectPolicy: String,
        stabilizationWindowSeconds: Number,
      },
      scaleUp: {
        policies: [{
          periodSeconds: Number,
          type: String,
          value: Number,
        }],
        selectPolicy: String,
        stabilizationWindowSeconds: Number,
      },
    },
    maxReplicas: Number,
    metrics: [{
      containerResource: {
        container: String,
        name: String,
        target: {
          averageUtilization: Number,
          averageValue: String,
          type: String,
          value: String,
        },
      },
      external: {
        metric: {
          name: String,
          selector: {
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
        },
        target: {
          averageUtilization: Number,
          averageValue: String,
          type: String,
          value: String,
        },
      },
      object: {
        describedObject: {
          apiVersion: String,
          kind: String,
          name: String,
        },
        metric: {
          name: String,
          selector: {
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
        },
        target: {
          averageUtilization: Number,
          averageValue: String,
          type: String,
          value: String,
        },
      },
      pods: {
        metric: {
          name: String,
          selector: {
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
        },
        target: {
          averageUtilization: Number,
          averageValue: String,
          type: String,
          value: String,
        },
      },
      resource: {
        name: String,
        target: {
          averageUtilization: Number,
          averageValue: String,
          type: String,
          value: String,
        },
      },
      type: String,
    }],
    minReplicas: Number,
    scaleTargetRef: {
      apiVersion: String,
      kind: String,
      name: String,
    },
  },
  status: {
    conditions: [statusConditions],
    currentMetrics: [{
      containerResource: {
        container: String,
        current: {
          averageUtilization: Number,
          averageValue: String,
          value: String,
        },
        name: String,
      },
      external: {
        current: {
          averageUtilization: Number,
          averageValue: String,
          value: String,
        },
        metric: {
          name: String,
          selector: {
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
        },
      },
      object: {
        current: {
          averageUtilization: Number,
          averageValue: String,
          value: String,
        },
        describedObject: {
          apiVersion: String,
          kind: String,
          name: String,
        },
        metric: {
          name: String,
          selector: {
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
        },
      },
      pods: {
        current: {
          averageUtilization: Number,
          averageValue: String,
          value: String,
        },
        metric: {
          name: String,
          selector: {
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
        },
      },
      resource: {
        current: {
          averageUtilization: Number,
          averageValue: String,
          value: String,
        },
        name: String,
      },
      type: String,
    }],
    currentReplicas: Number,
    desiredReplicas: Number,
    lastScaleTime: String,
    observedGeneration: Number,
  },
});

const ingressClassSchema = Schema({
  apiVersion: String,
  kind: String,
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

const jobSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    activeDeadlineSeconds: Number,
    backoffLimit: Number,
    completionMode: String,
    completions: Number,
    manualSelector: Boolean,
    parallelism: Number,
    podFailurePolicy: {
      rules: [{
        action: String,
        onExitCodes: {
          containerName: String,
          operator: String,
          values: [Number],
        },
        onPodConditions: [{
          status: String,
          type: String,
        }],
      }],
    },
    selector: {
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
    suspend: Boolean,
    template: pod,
    ttlSecondsAfterFinished: Number,
  },
  status: {
    active: Number,
    completedIndexes: String,
    completionTime: String,
    conditions: [statusConditions],
    failed: Number,
    ready: Number,
    startTime: String,
    succeeded: Number,
    uncountedTerminatedPods: {
      failed: [String],
      succeeded: [String],
    },
  },
});

const leaseSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    acquireTime: String,
    holderIdentity: String,
    leaseDurationSeconds: Number,
    leaseTransitions: Number,
    renewTime: String,
  },
});

const limitRangeSchema = Schema({
  apiVersion: String,
  kind: String,
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
  apiVersion: String,
  kind: String,
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
    uid: String,
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
  apiVersion: String,
  kind: String,
  metadata,
  webhooks: [{
    admissionReviewVersions: [String],
    clientConfig: {
      caBundle: String,
      service: {
        name: String,
        namespace: String,
        path: String,
        port: Number,
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
    namespaceSelector: {
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
    objectSelector: {
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
    reinvocationPolicy: String,
    rules: [{
      apiGroups: [String],
      apiVersions: [String],
      operations: [String],
      resources: [String],
      scope: String,
    }],
    sideEffects: String,
    timeoutSeconds: Number,
  }],
});

const networkPolicySchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    egress: [{
      ports: [{
        endPort: Number,
        port: String,
        protocol: String,
      }],
      to: [{
        ipBlock: {
          cidr: String,
          except: [String],
        },
        namespaceSelector: {
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
        podSelector: {
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
      }],
    }],
    ingress: [{
      from: [{
        ipBlock: {
          cidr: String,
          except: [String],
        },
        namespaceSelector: {
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
        podSelector: {
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
      }],
      ports: [{
        endPort: Number,
        port: String,
        protocol: String,
      }],
    }],
    podSelector: {
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
    policyTypes: [String],
  },
  status: {
    conditions: [statusConditions],
  },
});

const persistentVolumeSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    accessModes: [String],
    awsElasticBlockStore: {
      fsType: String,
      partition: Number,
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
      secretNamespace: String,
      shareName: String,
    },
    capacity: {
      type: Map,
      of: String,
    },
    cephfs: {
      monitors: [String],
      path: String,
      readOnly: Boolean,
      secretFile: String,
      secretRef: {
        name: String,
        namespace: String,
      },
      user: String,
    },
    cinder: {
      fsType: String,
      readOnly: Boolean,
      secretRef: {
        name: String,
        namespace: String,
      },
      volumeID: String,
    },
    claimRef: {
      apiVersion: String,
      fieldPath: String,
      kind: String,
      name: String,
      namespace: String,
      resourceVersion: String,
      uid: String,
    },
    csi: {
      controllerExpandSecretRef: {
        name: String,
        namespace: String,
      },
      controllerPublishSecretRef: {
        name: String,
        namespace: String,
      },
      driver: String,
      fsType: String,
      nodeExpandSecretRef: {
        name: String,
        namespace: String,
      },
      nodePublishSecretRef: {
        name: String,
        namespace: String,
      },
      nodeStageSecretRef: {
        name: String,
        namespace: String,
      },
      readOnly: Boolean,
      volumeAttributes: {
        type: Map,
        of: String,
      },
      volumeHandle: String,
    },
    fc: {
      fsType: String,
      lun: Number,
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
        namespace: String,
      },
    },
    flocker: {
      datasetName: String,
      datasetUUID: String,
    },
    gcePersistentDisk: {
      fsType: String,
      partition: Number,
      pdName: String,
      readOnly: Boolean,
    },
    glusterfs: {
      endpoints: String,
      endpointsNamespace: String,
      path: String,
      readOnly: Boolean,
    },
    hostPath: {
      path: String,
      type: String,
    },
    iscsi: {
      chapAuthDiscovery: Boolean,
      chapAuthSession: Boolean,
      fsType: String,
      initiatorName: String,
      iqn: String,
      iscsiInterface: String,
      lun: Number,
      portals: [String],
      readOnly: Boolean,
      secretRef: {
        name: String,
        namespace: String,
      },
      targetPortal: String,
    },
    local: {
      fsType: String,
      path: String,
    },
    mountOptions: [String],
    nfs: {
      path: String,
      readOnly: Boolean,
      server: String,
    },
    nodeAffinity: {
      required: {
        nodeSelectorTerms: [{
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
        }],
      },
    },
    persistentVolumeReclaimPolicy: String,
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
        namespace: String,
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
        namespace: String,
      },
      sslEnabled: Boolean,
      storageMode: String,
      storagePool: String,
      system: String,
      volumeName: String,
    },
    storageClassName: String,
    storageos: {
      fsType: String,
      readOnly: Boolean,
      secretRef: {
        apiVersion: String,
        fieldPath: String,
        kind: String,
        name: String,
        namespace: String,
        resourceVersion: String,
        uid: String,
      },
      volumeName: String,
      volumeNamespace: String,
    },
    volumeMode: String,
    vsphereVolume: {
      fsType: String,
      storagePolicyID: String,
      storagePolicyName: String,
      volumePath: String,
    },
  },
  status: {
    message: String,
    phase: String,
    reason: String,
  },
});

const persistentVolumeClaimSchema = Schema({
  apiVersion: String,
  kind: String,
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
    selector: {
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
      lastProbeTime: String,
    }],
    phase: String,
    resizeStatus: String,
  },
});

const podDisruptionBudgetSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    maxUnavailable: String,
    minAvailable: String,
    selector: {
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
    unhealthyPodEvictionPolicy: String,
  },
  status: {
    conditions: [{
      ...statusConditions,
      observedGeneration: Number,
    }],
    currentHealthy: Number,
    desiredHealthy: Number,
    disruptedPods: {
      type: Map,
      of: String,
    },
    disruptionsAllowed: Number,
    expectedPods: Number,
    observedGeneration: Number,
  },
});

const priorityClassSchema = Schema({
  apiVersion: String,
  description: String,
  globalDefault: Boolean,
  kind: String,
  metadata,
  preemptionPolicy: String,
  value: Number,
});

const resourceQuotaSchema = Schema({
  apiVersion: String,
  kind: String,
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
  apiVersion: String,
  handler: String,
  kind: String,
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
      tolerationSeconds: Number,
      value: String,
    }],
  },
});

const selfSubjectAccessReviewSchema = Schema({
  apiVersion: String,
  kind: String,
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

const selfSubjectReviewSchema = Schema({});

const selfSubjectRulesReviewSchema = Schema({
  apiVersion: String,
  kind: String,
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
  apiVersion: String,
  automountServiceAccountToken: Boolean,
  imagePullSecrets: [{
    name: String,
  }],
  kind: String,
  metadata,
  secrets: [{
    apiVersion: String,
    fieldPath: String,
    kind: String,
    name: String,
    namespace: String,
    resourceVersion: String,
    uid: String,
  }],
});

const statefulSetSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    minReadySeconds: Number,
    ordinals: {
      start: Number,
    },
    persistentVolumeClaimRetentionPolicy: {
      whenDeleted: String,
      whenScaled: String,
    },
    podManagementPolicy: String,
    replicas: Number,
    revisionHistoryLimit: Number,
    selector: {
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
    serviceName: String,
    template: pod,
    updateStrategy: {
      rollingUpdate: {
        maxUnavailable: String,
        partition: Number,
      },
      type: String,
    },
    volumeClaimTemplates: [{
      apiVersion: String,
      kind: String,
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
        selector: {
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
          ...statusConditions
          lastProbeTime: String,
        }],
        phase: String,
        resizeStatus: String,
      },
    }],
  },
  status: {
    availableReplicas: Number,
    collisionCount: Number,
    conditions: [statusConditions],
    currentReplicas: Number,
    currentRevision: String,
    observedGeneration: Number,
    readyReplicas: Number,
    replicas: Number,
    updateRevision: String,
    updatedReplicas: Number,
  },
});

const storageClassSchema = Schema({
  allowVolumeExpansion: Boolean,
  allowedTopologies: [{
    matchLabelExpressions: [{
      key: String,
      values: [String],
    }],
  }],
  apiVersion: String,
  kind: String,
  metadata,
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
  apiVersion: String,
  kind: String,
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
    uid: String,
    user: String,
  },
  status: {
    allowed: Boolean,
    denied: Boolean,
    evaluationError: String,
    reason: String,
  },
});

const tokenRequestSchema = Schema({});

const tokenReviewSchema = Schema({
  apiVersion: String,
  kind: String,
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
      uid: String,
      username: String,
    },
  },
});

const validatingWebhookConfigurationSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  webhooks: [{
    admissionReviewVersions: [String],
    clientConfig: {
      caBundle: String,
      service: {
        name: String,
        namespace: String,
        path: String,
        port: Number,
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
    namespaceSelector: {
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
    objectSelector: {
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
    rules: [{
      apiGroups: [String],
      apiVersions: [String],
      operations: [String],
      resources: [String],
      scope: String,
    }],
    sideEffects: String,
    timeoutSeconds: Number,
  }],
});

const volumeSchema = Schema({});

const volumeAttachmentSchema = Schema({
  apiVersion: String,
  kind: String,
  metadata,
  spec: {
    attacher: String,
    nodeName: String,
    source: {
      inlineVolumeSpec: {
        accessModes: [String],
        awsElasticBlockStore: {
          fsType: String,
          partition: Number,
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
          secretNamespace: String,
          shareName: String,
        },
        capacity: {
          type: Map,
          of: String,
        },
        cephfs: {
          monitors: [String],
          path: String,
          readOnly: Boolean,
          secretFile: String,
          secretRef: {
            name: String,
            namespace: String,
          },
          user: String,
        },
        cinder: {
          fsType: String,
          readOnly: Boolean,
          secretRef: {
            name: String,
            namespace: String,
          },
          volumeID: String,
        },
        claimRef: {
          apiVersion: String,
          fieldPath: String,
          kind: String,
          name: String,
          namespace: String,
          resourceVersion: String,
          uid: String,
        },
        csi: {
          controllerExpandSecretRef: {
            name: String,
            namespace: String,
          },
          controllerPublishSecretRef: {
            name: String,
            namespace: String,
          },
          driver: String,
          fsType: String,
          nodeExpandSecretRef: {
            name: String,
            namespace: String,
          },
          nodePublishSecretRef: {
            name: String,
            namespace: String,
          },
          nodeStageSecretRef: {
            name: String,
            namespace: String,
          },
          readOnly: Boolean,
          volumeAttributes: {
            type: Map,
            of: String,
          },
          volumeHandle: String,
        },
        fc: {
          fsType: String,
          lun: Number,
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
            namespace: String,
          },
        },
        flocker: {
          datasetName: String,
          datasetUUID: String,
        },
        gcePersistentDisk: {
          fsType: String,
          partition: Number,
          pdName: String,
          readOnly: Boolean,
        },
        glusterfs: {
          endpoints: String,
          endpointsNamespace: String,
          path: String,
          readOnly: Boolean,
        },
        hostPath: {
          path: String,
          type: String,
        },
        iscsi: {
          chapAuthDiscovery: Boolean,
          chapAuthSession: Boolean,
          fsType: String,
          initiatorName: String,
          iqn: String,
          iscsiInterface: String,
          lun: Number,
          portals: [String],
          readOnly: Boolean,
          secretRef: {
            name: String,
            namespace: String,
          },
          targetPortal: String,
        },
        local: {
          fsType: String,
          path: String,
        },
        mountOptions: [String],
        nfs: {
          path: String,
          readOnly: Boolean,
          server: String,
        },
        nodeAffinity: {
          required: {
            nodeSelectorTerms: [{
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
            }],
          },
        },
        persistentVolumeReclaimPolicy: String,
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
            namespace: String,
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
            namespace: String,
          },
          sslEnabled: Boolean,
          storageMode: String,
          storagePool: String,
          system: String,
          volumeName: String,
        },
        storageClassName: String,
        storageos: {
          fsType: String,
          readOnly: Boolean,
          secretRef: {
            apiVersion: String,
            fieldPath: String,
            kind: String,
            name: String,
            namespace: String,
            resourceVersion: String,
            uid: String,
          },
          volumeName: String,
          volumeNamespace: String,
        },
        volumeMode: String,
        vsphereVolume: {
          fsType: String,
          storagePolicyID: String,
          storagePolicyName: String,
          volumePath: String,
        },
      },
      persistentVolumeName: String,
    },
  },
  status: {
    attachError: {
      message: String,
      time: String,
    },
    attached: Boolean,
    attachmentMetadata: {
      type: Map,
      of: String,
    },
    detachError: {
      message: String,
      time: String,
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
  CSIDriver: model('CSIDriver', cSIDriverSchema),
  CSINode: model('CSINode', cSINodeSchema),
  CSIStorageCapacity: model('CSIStorageCapacity', cSIStorageCapacitySchema),
  CustomResourceDefinition: model('CustomResourceDefinition', customResourceDefinitionSchema),
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
