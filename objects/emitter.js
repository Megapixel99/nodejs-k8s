const EventEmitter = require('events');
const Event = require('./event.js');

class Emitter extends EventEmitter {
  constructor(config) {
    super();
    this.metadata = config.metadata;
    this.kind = config.kind;
    this.spec = config.spec;
  }
  emit(type, ...args) {
    let objRef = {
      kind: this.kind,
      namespace: this.metadata.namespace,
      name: this.metadata.generateName,
      uid: this.metadata.uid,
      apiVersion: this.metadata.apiVersion,
      resourceVersion: this.metadata.resourceVersion,
    };
    Event.create({
      metadata: this.metadata,
      deprecatedSource: {
        component: 'kubelet',
        host: '',
      },
      note: type,
      reason: type,
      regarding: objRef,
      related: objRef,
      reportingController: 'kubelet',
      reportingInstance: '',
      type: 'Normal'
    });
    super.emit(type, ...args)
  }
}

module.exports = Emitter;
