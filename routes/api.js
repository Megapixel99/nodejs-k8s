const router = require('express').Router();

router.get('/apis', (req, res, next) => {
  res.json({
    "kind": "APIGroupList",
    "apiVersion": "v1",
    "groups": [
      // {
      //   "name": "apiregistration.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "apiregistration.k8s.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "apiregistration.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      {
        "name": "apps",
        "versions": [
          {
            "groupVersion": "apps/v1",
            "version": "v1"
          }
        ],
        "preferredVersion": {
          "groupVersion": "apps/v1",
          "version": "v1"
        }
      },
      // {
      //   "name": "events.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "events.k8s.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "events.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "authentication.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "authentication.k8s.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "authentication.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "authorization.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "authorization.k8s.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "authorization.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "autoscaling",
      //   "versions": [
      //     {
      //       "groupVersion": "autoscaling/v2",
      //       "version": "v2"
      //     },
      //     {
      //       "groupVersion": "autoscaling/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "autoscaling/v2",
      //     "version": "v2"
      //   }
      // },
      // {
      //   "name": "batch",
      //   "versions": [
      //     {
      //       "groupVersion": "batch/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "batch/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "certificates.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "certificates.k8s.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "certificates.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      {
        "name": "networking.k8s.io",
        "versions": [
          {
            "groupVersion": "networking.k8s.io/v1",
            "version": "v1"
          }
        ],
        "preferredVersion": {
          "groupVersion": "networking.k8s.io/v1",
          "version": "v1"
        }
      },
      // {
      //   "name": "policy",
      //   "versions": [
      //     {
      //       "groupVersion": "policy/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "policy/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "rbac.authorization.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "rbac.authorization.k8s.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "rbac.authorization.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "storage.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "storage.k8s.io/v1",
      //       "version": "v1"
      //     },
      //     {
      //       "groupVersion": "storage.k8s.io/v1beta1",
      //       "version": "v1beta1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "storage.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "admissionregistration.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "admissionregistration.k8s.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "admissionregistration.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "apiextensions.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "apiextensions.k8s.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "apiextensions.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "scheduling.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "scheduling.k8s.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "scheduling.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "coordination.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "coordination.k8s.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "coordination.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "node.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "node.k8s.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "node.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "discovery.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "discovery.k8s.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "discovery.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "flowcontrol.apiserver.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "flowcontrol.apiserver.k8s.io/v1beta3",
      //       "version": "v1beta3"
      //     },
      //     {
      //       "groupVersion": "flowcontrol.apiserver.k8s.io/v1beta2",
      //       "version": "v1beta2"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "flowcontrol.apiserver.k8s.io/v1beta3",
      //     "version": "v1beta3"
      //   }
      // },
      // {
      //   "name": "apps.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "apps.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "apps.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "authorization.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "authorization.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "authorization.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "build.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "build.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "build.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "image.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "image.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "image.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "oauth.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "oauth.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "oauth.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "project.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "project.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "project.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "quota.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "quota.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "quota.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "route.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "route.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "route.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "security.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "security.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "security.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "template.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "template.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "template.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "user.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "user.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "user.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "packages.operators.coreos.com",
      //   "versions": [
      //     {
      //       "groupVersion": "packages.operators.coreos.com/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "packages.operators.coreos.com/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "config.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "config.openshift.io/v1",
      //       "version": "v1"
      //     },
      //     {
      //       "groupVersion": "config.openshift.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "config.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "operator.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "operator.openshift.io/v1",
      //       "version": "v1"
      //     },
      //     {
      //       "groupVersion": "operator.openshift.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "operator.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "acme.cert-manager.io",
      //   "versions": [
      //     {
      //       "groupVersion": "acme.cert-manager.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "acme.cert-manager.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "apiserver.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "apiserver.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "apiserver.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "apps.open-cluster-management.io",
      //   "versions": [
      //     {
      //       "groupVersion": "apps.open-cluster-management.io/v1",
      //       "version": "v1"
      //     },
      //     {
      //       "groupVersion": "apps.open-cluster-management.io/v1beta1",
      //       "version": "v1beta1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "apps.open-cluster-management.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "autoscaling.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "autoscaling.openshift.io/v1",
      //       "version": "v1"
      //     },
      //     {
      //       "groupVersion": "autoscaling.openshift.io/v1beta1",
      //       "version": "v1beta1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "autoscaling.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "cert-manager.io",
      //   "versions": [
      //     {
      //       "groupVersion": "cert-manager.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "cert-manager.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "cloudcredential.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "cloudcredential.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "cloudcredential.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "console.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "console.openshift.io/v1",
      //       "version": "v1"
      //     },
      //     {
      //       "groupVersion": "console.openshift.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "console.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "core.libopenstorage.org",
      //   "versions": [
      //     {
      //       "groupVersion": "core.libopenstorage.org/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "core.libopenstorage.org/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "hive.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "hive.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "hive.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "imageregistry.operator.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "imageregistry.operator.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "imageregistry.operator.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "ingress.operator.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "ingress.operator.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "ingress.operator.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "k8s.cni.cncf.io",
      //   "versions": [
      //     {
      //       "groupVersion": "k8s.cni.cncf.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "k8s.cni.cncf.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "logging.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "logging.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "logging.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "machine.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "machine.openshift.io/v1",
      //       "version": "v1"
      //     },
      //     {
      //       "groupVersion": "machine.openshift.io/v1beta1",
      //       "version": "v1beta1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "machine.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "machineconfiguration.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "machineconfiguration.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "machineconfiguration.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "monitoring.coreos.com",
      //   "versions": [
      //     {
      //       "groupVersion": "monitoring.coreos.com/v1",
      //       "version": "v1"
      //     },
      //     {
      //       "groupVersion": "monitoring.coreos.com/v1beta1",
      //       "version": "v1beta1"
      //     },
      //     {
      //       "groupVersion": "monitoring.coreos.com/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "monitoring.coreos.com/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "network.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "network.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "network.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "network.operator.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "network.operator.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "network.operator.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "operator.open-cluster-management.io",
      //   "versions": [
      //     {
      //       "groupVersion": "operator.open-cluster-management.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "operator.open-cluster-management.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "operators.coreos.com",
      //   "versions": [
      //     {
      //       "groupVersion": "operators.coreos.com/v2",
      //       "version": "v2"
      //     },
      //     {
      //       "groupVersion": "operators.coreos.com/v1",
      //       "version": "v1"
      //     },
      //     {
      //       "groupVersion": "operators.coreos.com/v1alpha2",
      //       "version": "v1alpha2"
      //     },
      //     {
      //       "groupVersion": "operators.coreos.com/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "operators.coreos.com/v2",
      //     "version": "v2"
      //   }
      // },
      // {
      //   "name": "performance.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "performance.openshift.io/v2",
      //       "version": "v2"
      //     },
      //     {
      //       "groupVersion": "performance.openshift.io/v1",
      //       "version": "v1"
      //     },
      //     {
      //       "groupVersion": "performance.openshift.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "performance.openshift.io/v2",
      //     "version": "v2"
      //   }
      // },
      // {
      //   "name": "quay.redhat.com",
      //   "versions": [
      //     {
      //       "groupVersion": "quay.redhat.com/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "quay.redhat.com/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "samples.operator.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "samples.operator.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "samples.operator.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "security.internal.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "security.internal.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "security.internal.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "snapshot.storage.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "snapshot.storage.k8s.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "snapshot.storage.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "submariner.io",
      //   "versions": [
      //     {
      //       "groupVersion": "submariner.io/v1",
      //       "version": "v1"
      //     },
      //     {
      //       "groupVersion": "submariner.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "submariner.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "tuned.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "tuned.openshift.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "tuned.openshift.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "volumesnapshot.external-storage.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "volumesnapshot.external-storage.k8s.io/v1",
      //       "version": "v1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "volumesnapshot.external-storage.k8s.io/v1",
      //     "version": "v1"
      //   }
      // },
      // {
      //   "name": "autopilot.libopenstorage.org",
      //   "versions": [
      //     {
      //       "groupVersion": "autopilot.libopenstorage.org/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "autopilot.libopenstorage.org/v1alpha1",
      //     "version": "v1alpha1"
      //   }
      // },
      // {
      //   "name": "citrix.com",
      //   "versions": [
      //     {
      //       "groupVersion": "citrix.com/v1beta1",
      //       "version": "v1beta1"
      //     },
      //     {
      //       "groupVersion": "citrix.com/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "citrix.com/v1beta1",
      //     "version": "v1beta1"
      //   }
      // },
      // {
      //   "name": "cluster.open-cluster-management.io",
      //   "versions": [
      //     {
      //       "groupVersion": "cluster.open-cluster-management.io/v1beta1",
      //       "version": "v1beta1"
      //     },
      //     {
      //       "groupVersion": "cluster.open-cluster-management.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "cluster.open-cluster-management.io/v1beta1",
      //     "version": "v1beta1"
      //   }
      // },
      // {
      //   "name": "cns.vmware.com",
      //   "versions": [
      //     {
      //       "groupVersion": "cns.vmware.com/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "cns.vmware.com/v1alpha1",
      //     "version": "v1alpha1"
      //   }
      // },
      // {
      //   "name": "controlplane.operator.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "controlplane.operator.openshift.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "controlplane.operator.openshift.io/v1alpha1",
      //     "version": "v1alpha1"
      //   }
      // },
      // {
      //   "name": "core.observatorium.io",
      //   "versions": [
      //     {
      //       "groupVersion": "core.observatorium.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "core.observatorium.io/v1alpha1",
      //     "version": "v1alpha1"
      //   }
      // },
      // {
      //   "name": "hiveinternal.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "hiveinternal.openshift.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "hiveinternal.openshift.io/v1alpha1",
      //     "version": "v1alpha1"
      //   }
      // },
      // {
      //   "name": "kdmp.portworx.com",
      //   "versions": [
      //     {
      //       "groupVersion": "kdmp.portworx.com/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "kdmp.portworx.com/v1alpha1",
      //     "version": "v1alpha1"
      //   }
      // },
      // {
      //   "name": "metal3.io",
      //   "versions": [
      //     {
      //       "groupVersion": "metal3.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "metal3.io/v1alpha1",
      //     "version": "v1alpha1"
      //   }
      // },
      // {
      //   "name": "migration.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "migration.k8s.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "migration.k8s.io/v1alpha1",
      //     "version": "v1alpha1"
      //   }
      // },
      // {
      //   "name": "multicluster.x-k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "multicluster.x-k8s.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "multicluster.x-k8s.io/v1alpha1",
      //     "version": "v1alpha1"
      //   }
      // },
      // {
      //   "name": "redhatcop.redhat.io",
      //   "versions": [
      //     {
      //       "groupVersion": "redhatcop.redhat.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "redhatcop.redhat.io/v1alpha1",
      //     "version": "v1alpha1"
      //   }
      // },
      // {
      //   "name": "stork.libopenstorage.org",
      //   "versions": [
      //     {
      //       "groupVersion": "stork.libopenstorage.org/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "stork.libopenstorage.org/v1alpha1",
      //     "version": "v1alpha1"
      //   }
      // },
      // {
      //   "name": "submarineraddon.open-cluster-management.io",
      //   "versions": [
      //     {
      //       "groupVersion": "submarineraddon.open-cluster-management.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "submarineraddon.open-cluster-management.io/v1alpha1",
      //     "version": "v1alpha1"
      //   }
      // },
      // {
      //   "name": "tower.ansible.com",
      //   "versions": [
      //     {
      //       "groupVersion": "tower.ansible.com/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "tower.ansible.com/v1alpha1",
      //     "version": "v1alpha1"
      //   }
      // },
      // {
      //   "name": "whereabouts.cni.cncf.io",
      //   "versions": [
      //     {
      //       "groupVersion": "whereabouts.cni.cncf.io/v1alpha1",
      //       "version": "v1alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "whereabouts.cni.cncf.io/v1alpha1",
      //     "version": "v1alpha1"
      //   }
      // },
      // {
      //   "name": "infrastructure.cluster.x-k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "infrastructure.cluster.x-k8s.io/v1beta1",
      //       "version": "v1beta1"
      //     },
      //     {
      //       "groupVersion": "infrastructure.cluster.x-k8s.io/v1alpha5",
      //       "version": "v1alpha5"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "infrastructure.cluster.x-k8s.io/v1beta1",
      //     "version": "v1beta1"
      //   }
      // },
      // {
      //   "name": "app.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "app.k8s.io/v1beta1",
      //       "version": "v1beta1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "app.k8s.io/v1beta1",
      //     "version": "v1beta1"
      //   }
      // },
      // {
      //   "name": "awx.ansible.com",
      //   "versions": [
      //     {
      //       "groupVersion": "awx.ansible.com/v1beta1",
      //       "version": "v1beta1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "awx.ansible.com/v1beta1",
      //     "version": "v1beta1"
      //   }
      // },
      // {
      //   "name": "helm.openshift.io",
      //   "versions": [
      //     {
      //       "groupVersion": "helm.openshift.io/v1beta1",
      //       "version": "v1beta1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "helm.openshift.io/v1beta1",
      //     "version": "v1beta1"
      //   }
      // },
      // {
      //   "name": "observability.open-cluster-management.io",
      //   "versions": [
      //     {
      //       "groupVersion": "observability.open-cluster-management.io/v1beta2",
      //       "version": "v1beta2"
      //     },
      //     {
      //       "groupVersion": "observability.open-cluster-management.io/v1beta1",
      //       "version": "v1beta1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "observability.open-cluster-management.io/v1beta2",
      //     "version": "v1beta2"
      //   }
      // },
      // {
      //   "name": "portworx.io",
      //   "versions": [
      //     {
      //       "groupVersion": "portworx.io/v1beta2",
      //       "version": "v1beta2"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "portworx.io/v1beta2",
      //     "version": "v1beta2"
      //   }
      // },
      // {
      //   "name": "lighthouse.submariner.io",
      //   "versions": [
      //     {
      //       "groupVersion": "lighthouse.submariner.io/v2alpha1",
      //       "version": "v2alpha1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "lighthouse.submariner.io/v2alpha1",
      //     "version": "v2alpha1"
      //   }
      // },
      // {
      //   "name": "metrics.k8s.io",
      //   "versions": [
      //     {
      //       "groupVersion": "metrics.k8s.io/v1beta1",
      //       "version": "v1beta1"
      //     }
      //   ],
      //   "preferredVersion": {
      //     "groupVersion": "metrics.k8s.io/v1beta1",
      //     "version": "v1beta1"
      //   }
      // }
    ]
  });
});


router.get('/apis/apps/v1', (req, res, next) => {
  res.json({
    "kind": "APIResourceList",
    "groupVersion": "apps/v1",
    "resources": [{
      "name": "deployments",
      "singularName": "deployment",
      "namespaced": true,
      "kind": "Deployment",
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
      "shortNames": [ "deploy" ],
      "categories": [ "all" ],
    }]
  });
});

router.get('/api/v1', (req, res, next) => {
  res.json({
    "kind": "APIResourceList",
    "groupVersion": "v1",
    "resources": [
      {
        "name": "bindings",
        "singularName": "",
        "namespaced": true,
        "kind": "Binding",
        "verbs": [
          "create"
        ]
      },
      {
        "name": "componentstatuses",
        "singularName": "",
        "namespaced": false,
        "kind": "ComponentStatus",
        "verbs": [
          "get",
          "list"
        ],
        "shortNames": [
          "cs"
        ]
      },
      {
        "name": "configmaps",
        "singularName": "",
        "namespaced": true,
        "kind": "ConfigMap",
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
        ],
      },
      {
        "name": "endpoints",
        "singularName": "",
        "namespaced": true,
        "kind": "Endpoints",
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
        ],
      },
      {
        "name": "events",
        "singularName": "",
        "namespaced": true,
        "kind": "Event",
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
        ],
      },
      {
        "name": "limitranges",
        "singularName": "",
        "namespaced": true,
        "kind": "LimitRange",
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
        ],
      },
      {
        "name": "namespaces",
        "singularName": "",
        "namespaced": false,
        "kind": "Namespace",
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
      },
      {
        "name": "namespaces/finalize",
        "singularName": "",
        "namespaced": false,
        "kind": "Namespace",
        "verbs": [
          "update"
        ]
      },
      {
        "name": "namespaces/status",
        "singularName": "",
        "namespaced": false,
        "kind": "Namespace",
        "verbs": [
          "get",
          "patch",
          "update"
        ]
      },
      {
        "name": "nodes",
        "singularName": "",
        "namespaced": false,
        "kind": "Node",
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
      },
      {
        "name": "nodes/proxy",
        "singularName": "",
        "namespaced": false,
        "kind": "NodeProxyOptions",
        "verbs": [
          "create",
          "delete",
          "get",
          "patch",
          "update"
        ]
      },
      {
        "name": "nodes/status",
        "singularName": "",
        "namespaced": false,
        "kind": "Node",
        "verbs": [
          "get",
          "patch",
          "update"
        ]
      },
      {
        "name": "persistentvolumeclaims",
        "singularName": "",
        "namespaced": true,
        "kind": "PersistentVolumeClaim",
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
      },
      {
        "name": "persistentvolumeclaims/status",
        "singularName": "",
        "namespaced": true,
        "kind": "PersistentVolumeClaim",
        "verbs": [
          "get",
          "patch",
          "update"
        ]
      },
      {
        "name": "persistentvolumes",
        "singularName": "",
        "namespaced": false,
        "kind": "PersistentVolume",
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
      },
      {
        "name": "persistentvolumes/status",
        "singularName": "",
        "namespaced": false,
        "kind": "PersistentVolume",
        "verbs": [
          "get",
          "patch",
          "update"
        ]
      },
      {
        "name": "pods",
        "singularName": "",
        "namespaced": true,
        "kind": "Pod",
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
      },
      {
        "name": "pods/attach",
        "singularName": "",
        "namespaced": true,
        "kind": "PodAttachOptions",
        "verbs": [
          "create",
          "get"
        ]
      },
      {
        "name": "pods/binding",
        "singularName": "",
        "namespaced": true,
        "kind": "Binding",
        "verbs": [
          "create"
        ]
      },
      {
        "name": "pods/ephemeralcontainers",
        "singularName": "",
        "namespaced": true,
        "kind": "Pod",
        "verbs": [
          "get",
          "patch",
          "update"
        ]
      },
      {
        "name": "pods/eviction",
        "singularName": "",
        "namespaced": true,
        "group": "policy",
        "version": "v1",
        "kind": "Eviction",
        "verbs": [
          "create"
        ]
      },
      {
        "name": "pods/exec",
        "singularName": "",
        "namespaced": true,
        "kind": "PodExecOptions",
        "verbs": [
          "create",
          "get"
        ]
      },
      {
        "name": "pods/log",
        "singularName": "",
        "namespaced": true,
        "kind": "Pod",
        "verbs": [
          "get"
        ]
      },
      {
        "name": "pods/portforward",
        "singularName": "",
        "namespaced": true,
        "kind": "PodPortForwardOptions",
        "verbs": [
          "create",
          "get"
        ]
      },
      {
        "name": "pods/proxy",
        "singularName": "",
        "namespaced": true,
        "kind": "PodProxyOptions",
        "verbs": [
          "create",
          "delete",
          "get",
          "patch",
          "update"
        ]
      },
      {
        "name": "pods/status",
        "singularName": "",
        "namespaced": true,
        "kind": "Pod",
        "verbs": [
          "get",
          "patch",
          "update"
        ]
      },
      {
        "name": "podtemplates",
        "singularName": "",
        "namespaced": true,
        "kind": "PodTemplate",
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
      },
      {
        "name": "replicationcontrollers",
        "singularName": "",
        "namespaced": true,
        "kind": "ReplicationController",
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
      },
      {
        "name": "replicationcontrollers/scale",
        "singularName": "",
        "namespaced": true,
        "group": "autoscaling",
        "version": "v1",
        "kind": "Scale",
        "verbs": [
          "get",
          "patch",
          "update"
        ]
      },
      {
        "name": "replicationcontrollers/status",
        "singularName": "",
        "namespaced": true,
        "kind": "ReplicationController",
        "verbs": [
          "get",
          "patch",
          "update"
        ]
      },
      {
        "name": "resourcequotas",
        "singularName": "",
        "namespaced": true,
        "kind": "ResourceQuota",
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
      },
      {
        "name": "resourcequotas/status",
        "singularName": "",
        "namespaced": true,
        "kind": "ResourceQuota",
        "verbs": [
          "get",
          "patch",
          "update"
        ]
      },
      {
        "name": "secrets",
        "singularName": "",
        "namespaced": true,
        "kind": "Secret",
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
      },
      {
        "name": "serviceaccounts",
        "singularName": "",
        "namespaced": true,
        "kind": "ServiceAccount",
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
      },
      {
        "name": "serviceaccounts/token",
        "singularName": "",
        "namespaced": true,
        "group": "authentication.k8s.io",
        "version": "v1",
        "kind": "TokenRequest",
        "verbs": [
          "create"
        ]
      },
      {
        "name": "services",
        "singularName": "",
        "namespaced": true,
        "kind": "Service",
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
      },
      {
        "name": "services/proxy",
        "singularName": "",
        "namespaced": true,
        "kind": "ServiceProxyOptions",
        "verbs": [
          "create",
          "delete",
          "get",
          "patch",
          "update"
        ]
      },
      {
        "name": "services/status",
        "singularName": "",
        "namespaced": true,
        "kind": "Service",
        "verbs": [
          "get",
          "patch",
          "update"
        ]
      }
    ]
  });
});

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
