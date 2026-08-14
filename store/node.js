// A store node: the MVCC keyspace, the Raft log that orders writes to it, and
// the transport peers use to reach each other.
//
// The split is the same one etcd makes. Reads are served from local state --
// a replica has applied the same log, so it has the same answer -- and writes
// are proposed to the leader, which is the only node allowed to decide what
// order they happened in. A follower that is asked to write forwards rather
// than guessing, because a write it accepted locally would be a write no other
// replica agreed to.
const path = require('path');
const { Store, StoreError, toBuffer } = require('./mvcc.js');
const { Raft } = require('./raft.js');
const { HttpTransport } = require('./transport.js');

class StoreNode {
  constructor({
    id = 'default', dir, address = 'http://127.0.0.1:2380', peers = [],
    heartbeatInterval, electionTimeout, snapshotEvery, sync = true,
    leaseSweepInterval = 500,
  } = {}) {
    this.id = id;
    this.address = address;
    this.peers = peers.filter((p) => p.id !== id);
    this.store = new Store();
    this.leaseSweepInterval = leaseSweepInterval;
    this.raft = new Raft({
      id,
      peers: this.peers,
      dir: dir || path.join(process.cwd(), '.store', id),
      apply: (cmd, index) => this.store.apply({ ...cmd, index }),
      transport: null,
      heartbeatInterval,
      electionTimeout,
      snapshotEvery,
      sync,
    });
    this.raft.snapshotState = () => this.store.snapshot();
    this.transport = new HttpTransport({
      address,
      handlers: {
        vote: (body) => this.raft.handleVote(body),
        append: (body) => this.raft.handleAppend(body),
        snapshot: (body) => this.raft.handleSnapshot(body, (state) => this.store.restore(state)),
        // A follower forwards a write here rather than applying it; the reply
        // is whatever the leader's own apply produced.
        forward: (body) => this.execute(body.cmd),
        status: () => this.status(),
      },
    });
    this.raft.transport = this.transport;
  }

  async start() {
    await this.transport.listen();
    await this.raft.start({ restore: (state) => this.store.restore(state) });
    this.leaseTimer = setInterval(() => this.sweepLeases(), this.leaseSweepInterval);
    this.leaseTimer.unref?.();
    return this;
  }

  async stop() {
    clearInterval(this.leaseTimer);
    this.raft.stop();
    await this.transport.close();
  }

  get isLeader() {
    return this.raft.role === 'leader';
  }

  status() {
    return { ...this.raft.status(), address: this.address, revision: this.store.revision };
  }

  // Wait until this node knows who the leader is. Useful at boot: a client
  // that writes into the election window would otherwise get NOT_LEADER for
  // reasons that have nothing to do with its request.
  waitForLeader(timeout = 5000) {
    let deadline = Date.now() + timeout;
    return new Promise((resolve, reject) => {
      let check = () => {
        if (this.raft.leaderId) {
          return resolve(this.raft.leaderId);
        }
        if (Date.now() > deadline) {
          return reject(new Error('etcdserver: no leader elected'));
        }
        setTimeout(check, 25);
      };
      check();
    });
  }

  // Every mutation goes through here: propose locally if we lead, forward to
  // whoever does if we don't. A cluster with no leader right now is a retry,
  // not a failure, so a short wait beats surfacing an election as an error.
  async execute(cmd, { retries = 20 } = {}) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (this.isLeader) {
        return this.raft.propose(cmd);
      }
      let leader = this.peers.find((p) => p.id === this.raft.leaderId);
      if (leader) {
        let reply = await this.transport.send(leader, 'forward', { cmd });
        if (reply && !reply.error) {
          return reply;
        }
        if (reply?.error) {
          throw new StoreError(reply.error, reply.code);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new StoreError('etcdserver: request timed out, possibly due to no leader', 14);
  }

  // ---- kv ----------------------------------------------------------------

  put(key, value, options = {}) {
    return this.execute({
      op: 'put',
      key,
      value: toBuffer(value).toString('base64'),
      lease: options.lease || 0,
      prevKv: !!options.prevKv,
      ignoreValue: !!options.ignoreValue,
      ignoreLease: !!options.ignoreLease,
    }).then((result) => ({
      revision: result.revision,
      prevKv: result.responses?.[0]?.prevKv || null,
    }));
  }

  // Reads don't enter the log. A follower answers from its own applied state,
  // which may trail the leader by a heartbeat -- that is exactly etcd's
  // serializable read, and callers that need better ask for linearizable.
  range(key, options = {}) {
    if (options.linearizable && !this.isLeader) {
      return this.execute({ op: 'txn', compare: [], success: [{ op: 'range', key, ...options }], failure: [] })
        .then((result) => result.responses[0]);
    }
    return Promise.resolve().then(() => this.store.range(key, options));
  }

  deleteRange(key, options = {}) {
    return this.execute({
      op: 'deleteRange', key, rangeEnd: options.rangeEnd || '', prevKv: !!options.prevKv,
    }).then((result) => ({
      revision: result.revision,
      deleted: result.responses?.[0]?.deleted || 0,
      prevKvs: result.responses?.[0]?.prevKvs || [],
    }));
  }

  // Compare-and-swap, which is the operation the API server is really built
  // on: "write this object only if its modRevision is still what I read".
  txn({ compare = [], success = [], failure = [] }) {
    return this.execute({
      op: 'txn',
      compare: compare.map(encodeCompare),
      success: success.map(encodeOp),
      failure: failure.map(encodeOp),
    });
  }

  seed(revision) {
    if (Number(revision) <= this.store.revision) {
      return Promise.resolve({ revision: this.store.revision });
    }
    return this.execute({ op: 'seed', revision: Number(revision) });
  }

  compact(revision) {
    return this.execute({ op: 'compact', revision });
  }

  // ---- leases ------------------------------------------------------------
  //
  // Expiry has to be decided by the log, not by each replica's clock, or two
  // replicas disagree about whether a key still exists. The leader notices an
  // expired lease and proposes the revocation; everyone else learns about it
  // the same way they learn about any other write.

  leaseGrant(ttl, id = 0) {
    return this.execute({ op: 'leaseGrant', ttl, id, expiry: Date.now() + ttl * 1000 });
  }

  leaseRevoke(id) {
    return this.execute({ op: 'leaseRevoke', id });
  }

  leaseKeepAlive(id) {
    let lease = this.store.leases.get(Number(id));
    let ttl = lease ? lease.ttl : 0;
    return this.execute({ op: 'leaseKeepAlive', id, expiry: Date.now() + ttl * 1000 });
  }

  leaseTimeToLive(id) {
    let lease = this.store.leases.get(Number(id));
    if (!lease) {
      return { id: Number(id), ttl: -1, grantedTTL: 0, keys: [] };
    }
    return {
      id: lease.id,
      ttl: Math.max(0, Math.round((lease.expiry - Date.now()) / 1000)),
      grantedTTL: lease.ttl,
      keys: [...lease.keys],
    };
  }

  sweepLeases() {
    if (!this.isLeader) {
      return;
    }
    for (const id of this.store.expiredLeases(Date.now())) {
      this.execute({ op: 'leaseRevoke', id }).catch(() => {});
    }
  }

  // ---- watch -------------------------------------------------------------

  watch(key, options = {}) {
    return this.store.watch(key, options);
  }
}

function encodeOp(op) {
  if (op.op === 'put') {
    return { ...op, value: toBuffer(op.value).toString('base64') };
  }
  return op;
}

// A compare on VALUE carries a value, and it has to be encoded the same way a
// put's is or the comparison is between a value and its own base64.
function encodeCompare(cmp) {
  if (cmp.target === 'VALUE') {
    return { ...cmp, value: toBuffer(cmp.value).toString('base64') };
  }
  return cmp;
}

module.exports = { StoreNode, StoreError };
