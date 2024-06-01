const { DateTime } = require('luxon');
const selfsigned = require('selfsigned');
const K8Object = require('./object.js');
const { Namespace: Model } = require('../database/models.js');
const Models = require('../database/models.js');
const CertificateSigningRequest = require('./certificateSigningRequest.js');
const ClusterRole = require('./clusterRole.js');
const ClusterRoleBinding = require('./clusterRoleBinding.js');
const ConfigMap = require('./configMap.js');
const ControllerRevision = require('./controllerRevision.js');
const CronJob = require('./cronJob.js');
const Csidriver = require('./csidriver.js');
const CsiNode = require('./csiNode.js');
const CsiStorageCapacity = require('./csiStorageCapacity.js');
const Daemonset = require('./daemonset.js');
const Deployment = require('./deployment.js');
const Endpoints = require('./endpoints.js');
const EndpointSlice = require('./endpointSlice.js');
const Event = require('./event.js');
const HorizontalPodAutoscaler = require('./horizontalPodAutoscaler.js');
const IngressClass = require('./ingressClass.js');
const Job = require('./job.js');
const LimitRange = require('./limitRange.js');
const LocalSubjectAccessReview = require('./localSubjectAccessReview.js');
const MutatingWebhookConfiguration = require('./mutatingWebhookConfiguration.js');
const NetworkPolicy = require('./networkPolicy.js');
const PersistentVolume = require('./persistentVolume.js');
const PersistentVolumeClaim = require('./persistentVolumeClaim.js');
const Pod = require('./pod.js');
const PodDisruptionBudget = require('./podDisruptionBudget.js');
const PodTemplate = require('./podTemplate.js');
const PriorityClass = require('./priorityClass.js');
const Replicaset = require('./replicaset.js');
const ReplicationController = require('./replicationController.js');
const ResourceQuota = require('./resourceQuota.js');
const Role = require('./role.js');
const RoleBinding = require('./roleBinding.js');
const Secret = require('./secret.js');
const SelfSubjectReview = require('./selfSubjectReview.js');
const SelfSubjectAccessReview = require('./selfSubjectAccessReview.js');
const SelfSubjectRulesReview = require('./selfSubjectRulesReview.js');
const Service = require('./service.js');
const ServiceAccount = require('./serviceAccount.js');
const StatefulSet = require('./statefulSet.js');
const StorageClass = require('./storageClass.js');
const SubjectAccessReview = require('./subjectAccessReview.js');
const TokenRequest = require('./tokenRequest.js');
const TokenReview = require('./tokenReview.js');
const ValidatingWebhookConfiguration = require('./validatingWebhookConfiguration.js');
const VolumeAttachment = require('./volumeAttachment.js');
const { duration } = require('../functions.js');

const objects = {
  CertificateSigningRequest,
  ClusterRole,
  ClusterRoleBinding,
  ConfigMap,
  ControllerRevision,
  CronJob,
  Csidriver,
  CsiNode,
  CsiStorageCapacity,
  Daemonset,
  Deployment,
  Endpoints,
  EndpointSlice,
  Event,
  HorizontalPodAutoscaler,
  IngressClass,
  Job,
  LimitRange,
  LocalSubjectAccessReview,
  MutatingWebhookConfiguration,
  NetworkPolicy,
  PersistentVolume,
  PersistentVolumeClaim,
  Pod,
  PodDisruptionBudget,
  PodTemplate,
  PriorityClass,
  Replicaset,
  ReplicationController,
  ResourceQuota,
  Role,
  RoleBinding,
  Secret,
  SelfSubjectReview,
  SelfSubjectAccessReview,
  SelfSubjectRulesReview,
  Service,
  ServiceAccount,
  StatefulSet,
  StorageClass,
  SubjectAccessReview,
  TokenRequest,
  TokenReview,
  ValidatingWebhookConfiguration,
  VolumeAttachment,
}

delete Models.Namespace;

class Namespace extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
    this.apiVersion = Namespace.apiVersion;
    this.kind = Namespace.kind;
    this.Model = Namespace.Model;
  }

  static apiVersion = 'v1';
  static kind = 'Namespace';
  static Model = Model;

  static create (config) {
    if (!config.metadata) {
      return Promise.reject(super.unprocessableContentStatus());
    }
    if (!config.metadata.name) {
      config.metadata.name = 'default'
    }
    if (!config.metadata.labels) {
      config.metadata.labels = new Map([['name', config.metadata.name]]);
    }
    return super.findOne({ 'metadata.name': config.metadata.name })
    .then((existingNamespace) => {
      if (existingNamespace) {
        throw super.alreadyExistsStatus(config.metadata.name);
      }
      let genCert = (attrs) => selfsigned.generate(attrs, { keySize: 2048, days: 3650, extensions: [{ name: 'subjectAltName', altNames: [] }] }).cert.trim().replaceAll('\r', '');
      let certs = [
        genCert([{ name: 'commonName', value: 'kube-apiserver-lb-signer' }]),
        genCert([{ name: 'commonName', value: 'kube-apiserver-localhost-signer' }]),
        genCert([{ name: 'commonName', value: 'kube-apiserver-service-network-signer' }]),
      ];
      return Promise.all([
        ServiceAccount.create({
          metadata: {
            name: "builder",
            namespace: config.metadata.name,
          }
        }),
        ServiceAccount.create({
          metadata: {
            name: "default",
            namespace: config.metadata.name,
          }
        }),
        ServiceAccount.create({
          metadata: {
            name: "deployer",
            namespace: config.metadata.name,
          }
        }),
        ConfigMap.create({
          metadata: {
            name: 'kube-root-ca.crt',
            namespace: config.metadata.name,
          },
          data: new Map()
        })
        .then((configMap) => {
          // configMap.data.set('ca.crt', certs.join('\n'));
          return new ConfigMap(configMap).update({ data: configMap.data });
        })
      ])
      .then(() => new Model(config).save({ validateBeforeSave: false }))
    })
  }

  async delete () {
    return Promise.all(Object.keys(Models).map((m) => Models[m].find({ 'metadata.namespace': this.metadata.name })))
    .then((resources) => {
      return Promise.all([
        ...resources.flat().map((resource) => new objects[resource.kind](resource).delete()),
        super.delete({ 'metadata.name': this.metadata.name }),
      ]);
    })
    .then((promises) => {
      let namespace = promises.at(-1);
      if (namespace) {
        return this.setConfig(namespace);
      }
    });
  }

  static async table (queryOptions = {}) {
    return {
        "kind": "Table",
        "apiVersion": "meta.k8s.io/v1",
        "metadata": {
          "resourceVersion": `${await super.hash(`${namespaces.length}${JSON.stringify(namespaces[0])}`)}`,
        },
        "columnDefinitions": [
          {
            "name": "Name",
            "type": "string",
            "format": "name",
            "description": "Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/identifiers#names",
            "priority": 0
          },
          {
            "name": "Age",
            "type": "string",
            "format": "",
            "description": "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata",
            "priority": 0
          },
        ],
        "rows": namespaces.map((e) => ({
          "cells": [
            e.metadata.name,
            duration(DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "") - e.metadata.creationTimestamp),
          ],
          object: {
            "kind": "PartialObjectMetadata",
            "apiVersion": "meta.k8s.io/v1",
            metadata: e.metadata,
          }
        })),
    }
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.spec = config.spec;
    this.status = config.status;
    return this;
  }
}

module.exports = Namespace;
