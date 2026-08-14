const router = require('express').Router();

// Built from the same table that serves /apis/{group}/{version}, so a group
// can't be advertised without its resource list (or vice versa).
const { apiGroupList } = require('./discovery.js');

router.get('/apis', (req, res, next) => {
  res.json(apiGroupList());
});


// apps/v1 is served from routes/discovery.js like every other group.

router.get('/api', (req, res, next) => {
  let headerOpts = {};
  req.headers?.accept?.split(';').forEach((a) => {
    if (a.includes('=')) {
      headerOpts[a.split('=')[0]] = a.split('=')[1]
    }
  });
  if (headerOpts?.as === 'APIGroupDiscoveryList,application/json' && headerOpts?.g === 'apidiscovery.k8s.io' && headerOpts?.v) {
    res.setHeader('Content-Type', `application/json;g=${headerOpts.g};v=${headerOpts?.v};as=APIGroupDiscoveryList`);
    res.send({
      kind: "APIGroupDiscoveryList",
      apiVersion: `${headerOpts.g}/${headerOpts.v}`,
      metadata: {},
      items: [{
        metadata: {
          creationTimestamp: null
        },
        versions: [{
          version: 'v1',
          resources: [
            {
              "resource": "bindings",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "Binding"
              },
              "scope": "Namespaced",
              "singularResource": "binding",
              "verbs": [
                "create"
              ]
            },
            {
              "resource": "componentstatuses",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "ComponentStatus"
              },
              "scope": "Cluster",
              "singularResource": "componentstatus",
              "verbs": [
                "get",
                "list"
              ],
              "shortNames": [
                "cs"
              ]
            },
            {
              "resource": "configmaps",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "ConfigMap"
              },
              "scope": "Namespaced",
              "singularResource": "configmap",
              "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ],
              "shortNames": [
                "cm"
              ]
            },
            {
              "resource": "endpoints",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "Endpoints"
              },
              "scope": "Namespaced",
              "singularResource": "endpoints",
              "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ],
              "shortNames": [
                "ep"
              ]
            },
            {
              "resource": "events",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "Event"
              },
              "scope": "Namespaced",
              "singularResource": "event",
              "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ],
              "shortNames": [
                "ev"
              ]
            },
            {
              "resource": "limitranges",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "LimitRange"
              },
              "scope": "Namespaced",
              "singularResource": "limitrange",
              "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ],
              "shortNames": [
                "limits"
              ]
            },
            {
              "resource": "namespaces",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "Namespace"
              },
              "scope": "Cluster",
              "singularResource": "namespace",
              "verbs": [
                "create",
                "delete",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ],
              "shortNames": [
                "ns"
              ],
              "subresources": [
                {
                  "subresource": "finalize",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "Namespace"
                  },
                  "verbs": [
                    "update"
                  ]
                },
                {
                  "subresource": "status",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "Namespace"
                  },
                  "verbs": [
                    "get",
                    "patch",
                    "update"
                  ]
                }
              ]
            },
            {
              "resource": "nodes",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "Node"
              },
              "scope": "Cluster",
              "singularResource": "node",
              "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ],
              "shortNames": [
                "no"
              ],
              "subresources": [
                {
                  "subresource": "proxy",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "NodeProxyOptions"
                  },
                  "verbs": [
                    "create",
                    "delete",
                    "get",
                    "patch",
                    "update"
                  ]
                },
                {
                  "subresource": "status",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "Node"
                  },
                  "verbs": [
                    "get",
                    "patch",
                    "update"
                  ]
                }
              ]
            },
            {
              "resource": "persistentvolumeclaims",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "PersistentVolumeClaim"
              },
              "scope": "Namespaced",
              "singularResource": "persistentvolumeclaim",
              "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ],
              "shortNames": [
                "pvc"
              ],
              "subresources": [
                {
                  "subresource": "status",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "PersistentVolumeClaim"
                  },
                  "verbs": [
                    "get",
                    "patch",
                    "update"
                  ]
                }
              ]
            },
            {
              "resource": "persistentvolumes",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "PersistentVolume"
              },
              "scope": "Cluster",
              "singularResource": "persistentvolume",
              "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ],
              "shortNames": [
                "pv"
              ],
              "subresources": [
                {
                  "subresource": "status",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "PersistentVolume"
                  },
                  "verbs": [
                    "get",
                    "patch",
                    "update"
                  ]
                }
              ]
            },
            {
              "resource": "pods",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "Pod"
              },
              "scope": "Namespaced",
              "singularResource": "pod",
              "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ],
              "shortNames": [
                "po"
              ],
              "categories": [
                "all"
              ],
              "subresources": [
                {
                  "subresource": "attach",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "PodAttachOptions"
                  },
                  "verbs": [
                    "create",
                    "get"
                  ]
                },
                {
                  "subresource": "binding",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "Binding"
                  },
                  "verbs": [
                    "create"
                  ]
                },
                {
                  "subresource": "ephemeralcontainers",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "Pod"
                  },
                  "verbs": [
                    "get",
                    "patch",
                    "update"
                  ]
                },
                {
                  "subresource": "eviction",
                  "responseKind": {
                    "group": "policy",
                    "version": "v1",
                    "kind": "Eviction"
                  },
                  "verbs": [
                    "create"
                  ]
                },
                {
                  "subresource": "exec",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "PodExecOptions"
                  },
                  "verbs": [
                    "create",
                    "get"
                  ]
                },
                {
                  "subresource": "log",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "Pod"
                  },
                  "verbs": [
                    "get"
                  ]
                },
                {
                  "subresource": "portforward",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "PodPortForwardOptions"
                  },
                  "verbs": [
                    "create",
                    "get"
                  ]
                },
                {
                  "subresource": "proxy",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "PodProxyOptions"
                  },
                  "verbs": [
                    "create",
                    "delete",
                    "get",
                    "patch",
                    "update"
                  ]
                },
                {
                  "subresource": "status",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "Pod"
                  },
                  "verbs": [
                    "get",
                    "patch",
                    "update"
                  ]
                }
              ]
            },
            {
              "resource": "podtemplates",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "PodTemplate"
              },
              "scope": "Namespaced",
              "singularResource": "podtemplate",
              "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ]
            },
            {
              "resource": "replicationcontrollers",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "ReplicationController"
              },
              "scope": "Namespaced",
              "singularResource": "replicationcontroller",
              "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ],
              "shortNames": [
                "rc"
              ],
              "categories": [
                "all"
              ],
              "subresources": [
                {
                  "subresource": "scale",
                  "responseKind": {
                    "group": "autoscaling",
                    "version": "v1",
                    "kind": "Scale"
                  },
                  "verbs": [
                    "get",
                    "patch",
                    "update"
                  ]
                },
                {
                  "subresource": "status",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "ReplicationController"
                  },
                  "verbs": [
                    "get",
                    "patch",
                    "update"
                  ]
                }
              ]
            },
            {
              "resource": "resourcequotas",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "ResourceQuota"
              },
              "scope": "Namespaced",
              "singularResource": "resourcequota",
              "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ],
              "shortNames": [
                "quota"
              ],
              "subresources": [
                {
                  "subresource": "status",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "ResourceQuota"
                  },
                  "verbs": [
                    "get",
                    "patch",
                    "update"
                  ]
                }
              ]
            },
            {
              "resource": "secrets",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "Secret"
              },
              "scope": "Namespaced",
              "singularResource": "secret",
              "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ]
            },
            {
              "resource": "serviceaccounts",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "ServiceAccount"
              },
              "scope": "Namespaced",
              "singularResource": "serviceaccount",
              "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ],
              "shortNames": [
                "sa"
              ],
              "subresources": [
                {
                  "subresource": "token",
                  "responseKind": {
                    "group": "authentication.k8s.io",
                    "version": "v1",
                    "kind": "TokenRequest"
                  },
                  "verbs": [
                    "create"
                  ]
                }
              ]
            },
            {
              "resource": "services",
              "responseKind": {
                "group": "",
                "version": "",
                "kind": "Service"
              },
              "scope": "Namespaced",
              "singularResource": "service",
              "verbs": [
                "create",
                "delete",
                "deletecollection",
                "get",
                "list",
                "patch",
                "update",
                "watch"
              ],
              "shortNames": [
                "svc"
              ],
              "categories": [
                "all"
              ],
              "subresources": [
                {
                  "subresource": "proxy",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "ServiceProxyOptions"
                  },
                  "verbs": [
                    "create",
                    "delete",
                    "get",
                    "patch",
                    "update"
                  ]
                },
                {
                  "subresource": "status",
                  "responseKind": {
                    "group": "",
                    "version": "",
                    "kind": "Service"
                  },
                  "verbs": [
                    "get",
                    "patch",
                    "update"
                  ]
                }
              ]
            }
          ]
        }]
      }]
    });
  } else {
    res.json({
      kind: "APIVersions",
      versions: [ "v1" ],
      serverAddressByClientCIDRs: [{
        clientCIDR: "0.0.0.0/0",
        serverAddress: "127.0.0.1:8080"
      }]
    });
  }
});

module.exports = router;
