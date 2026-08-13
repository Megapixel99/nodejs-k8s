const { DateTime } = require('luxon');
const K8Object = require('./object.js');
const EventEmitter = require('./emitter.js');
const Secret = require('./secret.js');
const ConfigMap = require('./configMap.js');
const { Pod: Model } = require('../database/models.js');
const { runImage, duration, stopContainer, getContainerIP, removeContainer, randomBytes, isContainerRunning, containerHasStarted, getContainerLogs, waitContainer, execInContainer, age } = require('../functions.js');
const http = require('http');
const net = require('net');

class Pod extends K8Object {
  constructor(config) {
    super(config);
    this.spec = config.spec;
    this.status = config.status;
    this.apiVersion = Pod.apiVersion;
    this.kind = Pod.kind;
    this.Model = Pod.Model;
  }

  static apiVersion = 'v1';
  static kind = 'Pod';
  static Model = Model;

  static async create(config = {}) {
    let otherPod = undefined;
    if (!config.metadata) {
      config.metadata = {};
    }
    if (!config.metadata.name) {
      config.metadata.name = 'default';
    }
    do {
      config.metadata.generateName = `${config.metadata.name}-${randomBytes(6).toString('hex')}`;
      otherPod = await Pod.findOne({ 'metadata.generateName': config.metadata.generateName });
    } while (otherPod);
    if (!config?.metadata?.creationTimestamp) {
      config.metadata.creationTimestamp = DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "");
    }
    if (!config.status) {
      config.status = {};
    }
    if (!config.status.conditions) {
      config.status.conditions = [];
    }
    config.status.conditions.push({
      type: "Initialized",
      status: 'True',
      lastTransitionTime: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
    });
    return super.create(config)
    .then((pod) => new Pod(pod))
    .then((newPod) => {
      // Kick off container startup in the background. A real kubelet would
      // return the Pod object immediately and let the node start containers
      // asynchronously; blocking here means POST /pods stalls past the test's
      // RESTClient timeout.
      newPod.start().catch((err) => {
        console.warn(`[pod ${newPod.metadata.generateName}] start failed:`, err?.message || err);
        newPod.patch({ $set: { 'status.phase': 'Failed', 'status.message': String(err?.message || err) } }).catch(() => {});
      });
      return newPod;
    });
  }

  events() {
    if (!this._emitter) {
      this._emitter = new EventEmitter(this);
    }
    return this._emitter;
  }

  async logs(container) {
    return (await getContainerLogs(`${this.metadata.generateName}-${container}`)).raw;
  }

  async setConfig(config) {
    await super.setResourceVersion();
    this.spec = config.spec;
    this.status = config.status;
    return this;
  }

  static async table (pods) {
    return {
      "kind": "Table",
      "apiVersion": "meta.k8s.io/v1",
      "metadata": {
        "resourceVersion": `${await super.hash(`${pods.length}${JSON.stringify(pods[0])}`)}`,
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
          "name": "Ready",
          "type": "string",
          "format": "",
          "description": "Whether or not the pod is ready",
          "priority": 0
        },
        {
          "name": "Status",
          "type": "string",
          "format": "",
          "description": "Current status of the pod.",
          "priority": 0
        },
        {
          "name": "Restarts",
          "type": "string",
          "format": "",
          "description": "Number of restarts for the pod.",
          "priority": 0
        },
        {
          "name": "Age",
          "type": "string",
          "format": "",
          "description": "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata",
          "priority": 0
        },
        {
          "name": "IP",
          "type": "string",
          "format": "",
          "description": "IP address of the pod.",
          "priority": 1
        },
        {
          "name": "Node",
          "type": "string",
          "format": "",
          "description": "Name of the node.",
          "priority": 1
        },
        {
          "name": "Nominated Node",
          "type": "string",
          "format": "",
          "description": "Name of the nominated node.",
          "priority": 1
        },
        {
          "name": "Readiness Gates",
          "type": "string",
          "format": "",
          "description": "Gate info.",
          "priority": 1
        }
      ],
      "rows": pods.map((e) => ({
        "cells": [
          e.metadata.name,
          `${(e.status?.containerStatuses || []).filter((c) => c.ready).length}/${(e.spec?.containers || []).length || 1}`,
          e.status?.phase,
          (e.status?.containerStatuses?.[0]?.restartCount || 0),
          age(e.metadata.creationTimestamp),
          (e.status?.podIP || '<none>'),
          // This printed metadata.generateName — the container-name prefix —
          // in the NODE column of `kubectl get pods -o wide`.
          (e.spec?.nodeName || '<none>'),
          (e.status?.nominatedNodeName || '<none>'),
          (e.spec?.readinessGates?.[0]?.conditionType || '<none>'),
        ],
        object: {
          "kind": "PartialObjectMetadata",
          "apiVersion": "meta.k8s.io/v1",
          metadata: e.metadata,
        }
      })),
    }
  }

  delete () {
    return super.delete()
    .then((pod) => pod ? new Pod(pod).stop() : Promise.resolve());
  }

  stop() {
    if (Array.isArray(this._probeIntervals)) {
      this._probeIntervals.forEach((i) => clearInterval(i));
      this._probeIntervals = [];
    }
    return Promise.all(this.spec.containers.map((e) => {
      return stopContainer(`${this.metadata.generateName}-${e.name}`)
        .catch((err) => {
          if (!err.stderr.includes('No such container') && !err.stderr.includes('No such object')) {
            throw err;
          }
        })
        .then(() => removeContainer(`${this.metadata.generateName}-${e.name}`))
        .catch((err) => {
          if (!err.stderr.includes('No such container') && !err.stderr.includes('No such object')) {
            throw err;
          }
        })
    })).then(() => {
      return this.toJSON();
    });
  }

  getEnvVarsFromSecret(secretName) {
    return Secret.findOne({ 'metadata.name': secretName, 'metadata.namespace': this.metadata.namespace })
      .then((secret) => {
        if (secret) {
          return secret.mapVariables()
        }
        throw K8Object.unprocessableContentStatus(this.kind, this.metadata.name, null, `Secret "${secretName}" not found`, 'Invalid')
      });
  }

  getEnvVarsFromConfigMaps(configNames) {
    return ConfigMap.find({
      'metadata.namespace': this.metadata.namespace,
      $or: configNames.map((e) => ({ 'metadata.name': e })),
     })
      .then((configMaps) => {
        if (configMaps) {
          return configMaps.map((e) => ({
            name: e.metadata.name,
            variables: e.mapVariables(),
          }));
        }
        return [];
      });
  }

  async runInitContainers() {
    if (!Array.isArray(this.spec.initContainers) || this.spec.initContainers.length === 0) {
      return;
    }
    for (const init of this.spec.initContainers) {
      let name = `${this.metadata.generateName}-init-${init.name}`;
      await runImage(init.image, name, { expose: (init.ports || []).map((p) => p.containerPort) });
      let exitCode = await waitContainer(name).catch(() => 1);
      if (exitCode !== 0) {
        await this.patch({
          $set: { 'status.phase': 'Failed', 'status.message': `init container ${init.name} exited ${exitCode}` },
        });
        throw new Error(`init container ${init.name} failed with ${exitCode}`);
      }
    }
  }

  scheduleProbes(containerSpec, containerName, podIP) {
    let checks = [];
    if (containerSpec.readinessProbe) checks.push(['readiness', containerSpec.readinessProbe]);
    if (containerSpec.livenessProbe) checks.push(['liveness', containerSpec.livenessProbe]);
    checks.forEach(([kind, probe]) => {
      let period = (probe.periodSeconds || 10) * 1000;
      let interval = setInterval(async () => {
        let ok = await this.runProbe(probe, containerName, podIP).catch(() => false);
        if (!ok && kind === 'liveness') {
          await stopContainer(containerName).catch(() => {});
          await runImage(containerSpec.image, containerName, {
            expose: (containerSpec.ports || []).map((p) => p.containerPort),
          }).catch(() => {});
        }
      }, period);
      this._probeIntervals = this._probeIntervals || [];
      this._probeIntervals.push(interval);
    });
  }

  async runProbe(probe, containerName, podIP) {
    if (probe.exec && probe.exec.command) {
      let cmd = Array.isArray(probe.exec.command) ? probe.exec.command.join(' ') : probe.exec.command;
      let res = await execInContainer(containerName, cmd);
      return res.code === 0;
    }
    if (probe.httpGet) {
      return new Promise((resolve) => {
        let req = http.request({
          host: podIP,
          port: probe.httpGet.port || 80,
          path: probe.httpGet.path || '/',
          method: 'GET',
          timeout: 2000,
        }, (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 400);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.end();
      });
    }
    if (probe.tcpSocket) {
      return new Promise((resolve) => {
        let sock = net.createConnection({ host: podIP, port: probe.tcpSocket.port, timeout: 2000 });
        sock.on('connect', () => { sock.end(); resolve(true); });
        sock.on('error', () => resolve(false));
        sock.on('timeout', () => { sock.destroy(); resolve(false); });
      });
    }
    return true;
  }

  async start() {
    await this.runInitContainers();
    let p = this.spec.containers.map(async (e) => {
      let options = {
        expose: (e.ports || []).map((a) => a.containerPort),
        command: e.command,
        args: e.args,
      }
      if (e.volumeMounts) {
        options['volumeMounts'] = (await Promise.all(e.volumeMounts.map(async (m) => {
          let v = (this.spec.volumes || []).find((a) => a.name === m.name);
          if (!v) return [];
          let cmSrc = v.configMap || v.volumeSource?.configMap;
          if (cmSrc) {
            let cmName = cmSrc.name || cmSrc.localObjectReference?.name;
            let c = await ConfigMap.findOne({ 'metadata.name': cmName, 'metadata.namespace': this.metadata.namespace });
            if (!c) return [];
            let keys = c.mapVariables().map((v) => v.name);
            let sourceDir = ConfigMap.volumeDirName(c);
            return keys.map((key) => ({ ...m, file: key, sourceDir }));
          }
          return [];
        }))).flat();
      }
      if (e.env || e.envFrom) {
        options['env'] = [];
        if (e.env) {
          options['env'].push(...e.env.filter((v) => v?.value));
          let cmRefs = e.env.filter((v) => v?.valueFrom?.configMapKeyRef);
          if (cmRefs.length > 0) {
            let configMaps = await this.getEnvVarsFromConfigMaps(
              cmRefs.map((v) => v.valueFrom.configMapKeyRef.name)
            );
            cmRefs.forEach((entry) => {
              let value = configMaps
                ?.find((v) => v.name === entry.valueFrom.configMapKeyRef.name)
                ?.variables
                ?.find((v) => v.name === entry.valueFrom.configMapKeyRef.key)
                ?.value;
              if (value !== undefined) {
                options['env'].push({ name: entry.name, value });
              }
            });
          }
          let secretRefs = e.env.filter((v) => v?.valueFrom?.secretKeyRef);
          for (const entry of secretRefs) {
            let secret = await Secret.findOne({
              'metadata.name': entry.valueFrom.secretKeyRef.name,
              'metadata.namespace': this.metadata.namespace,
            });
            let variables = secret?.mapVariables?.() || [];
            let value = variables.find((v) => v.name === entry.valueFrom.secretKeyRef.key)?.value;
            if (value !== undefined) {
              options['env'].push({ name: entry.name, value });
            }
          }
        }
        if (e.envFrom) {
          let collected = await Promise.all(e.envFrom.map(async (a) => {
            if (a.secretRef) {
              return this.getEnvVarsFromSecret(a.secretRef.name)
                .catch((err) => {
                  this.patch({
                    $push: {
                      'status.conditions': [{
                        type: "ContainersReady",
                        status: 'False',
                        lastTransitionTime: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
                      }],
                      'status.containerStatuses': [{
                        "restartCount": 0,
                        "started": false,
                        "ready": false,
                        "name": e.name,
                        "imageID": "",
                        "image": e.image,
                        "lastState": {},
                        "containerID": ""
                      }],
                    },
                  })
                  throw err;
                });
            }
            if (a.configMapRef) {
              let configMaps = await this.getEnvVarsFromConfigMaps([a.configMapRef.name]);
              return configMaps.flatMap((c) => c.variables);
            }
            return null;
          }));
          options['env'].push(...collected.flat().filter((v) => v));
        }
      }
      await runImage(e.image, `${this.metadata.generateName}-${e.name}`, options);
      return `${this.metadata.generateName}-${e.name}`;
    });
    return Promise.all(p)
    .then(async (podNames) => {
      return Promise.all(podNames.map((podName) => {
        return getContainerIP(podName)
          .then((ip) => {
            this.events().emit('NewContainer', {
              ip,
              nodeName: '',
              targetRef: {
                kind: this.kind,
                namespace: this.metadata.namespace,
                name: podName,
                uid: this.metadata.uid
              }
            });
            return [ip, podName];
          });
      }))
    })
    .then(async (podsInfo) => {
      return Promise.all(podsInfo.map((podInfo, idx) => {
        let [podIP, podName] = podInfo;
        let containerSpec = this.spec.containers[idx];
        return new Promise((resolve, reject) => {
          let attempts = 0;
          let inter = setInterval(async () => {
            try {
              attempts++;
              if ((await containerHasStarted(podName)) || attempts > 30) {
                clearInterval(inter);
                this.events().emit('ContainersReady', this);
                this.scheduleProbes(containerSpec, podName, podIP);
                this.patch({
                  $push: {
                    'status.conditions': [{
                      type: "ContainersReady",
                      status: 'True',
                      lastTransitionTime: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
                    }],
                    'status.podIPs': [{
                      ip: podIP
                    }],
                    'status.containerStatuses': [{
                      "restartCount": 0,
                      "started": true,
                      "ready": true,
                      "name": containerSpec.name,
                      "imageID": "",
                      "image": containerSpec.image,
                      "lastState": {},
                      // Without an explicit running state the only state on
                      // the object is whatever the schema defaults produce.
                      "state": {
                        running: {
                          startedAt: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
                        },
                      },
                      "containerID": podName
                    }],
                  },
                  $set: {
                    'status.podIP': podIP,
                  }
                })
                .then(() => resolve());
              }
            } catch (e) {
              reject(e);
            }
          }, 1000);
        });
      }));
    })
    .then(() => {
      this.events().emit('Ready', this);
      this.events().emit('PodScheduled', this);
      return this.patch({
        $push: {
          'status.conditions': [{
            type: "Ready",
            status: 'True',
            lastTransitionTime: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
          }, {
            type: "PodScheduled",
            status: 'True',
            lastTransitionTime: DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, ""),
          }],
        },
        $set: {
          'status.phase': 'Running'
        }
      });
    })
    .then(() => {
      // Background watcher: patch phase to Succeeded/Failed when containers exit.
      let names = this.spec.containers.map((c) => `${this.metadata.generateName}-${c.name}`);
      Promise.all(names.map((name) => waitContainer(name).catch(() => 1)))
        .then((exitCodes) => {
          let anyNonZero = exitCodes.some((c) => c !== 0);
          let phase = anyNonZero ? 'Failed' : 'Succeeded';
          let finishedAt = DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "");
          // The phase moved but the container statuses kept saying running, so
          // `kubectl describe` on a finished pod reported a running container.
          let containerStatuses = this.spec.containers.map((c, i) => ({
            name: c.name,
            image: c.image,
            imageID: '',
            containerID: `${this.metadata.generateName}-${c.name}`,
            restartCount: 0,
            started: false,
            ready: false,
            lastState: {},
            state: {
              terminated: {
                exitCode: exitCodes[i] ?? 0,
                reason: (exitCodes[i] ?? 0) === 0 ? 'Completed' : 'Error',
                finishedAt,
                containerID: `${this.metadata.generateName}-${c.name}`,
              },
            },
          }));
          return this.patch({
            $set: {
              'status.phase': phase,
              'status.containerStatuses': containerStatuses,
            },
          });
        })
        .catch((err) => console.warn(`[pod ${this.metadata.name}] exit watcher error:`, err?.message || err));
      return this;
    });
  }

  getSpec() {
    return this.spec;
  }

  getStatus() {
    return this.status;
  }
}

module.exports = Pod;
