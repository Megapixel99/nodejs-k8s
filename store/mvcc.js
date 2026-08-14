// The MVCC keyspace, modelled on etcd's.
//
// The thing that makes etcd more than a key/value store -- and the reason the
// Kubernetes API server can offer a watch you can resume -- is that writes are
// ordered by a single cluster-wide revision, and old revisions stay readable
// until someone compacts them. A key doesn't have "a value"; it has a chain of
// values, each stamped with the revision that wrote it. Reads can name a
// revision, and a watch can start from one.
//
// Everything here is synchronous and deterministic: it is the state machine
// that Raft applies committed entries to, so two replicas applying the same
// log must reach the same state. No clocks, no randomness, no I/O. Anything
// time-dependent (lease expiry) arrives as a value inside the command.

// A single key's history. `deleted` tombstones are kept because a read at an
// older revision has to see the value that was there, and a watch replaying
// from before the delete has to report the delete itself.
class Store {
  constructor() {
    this.revision = 0;
    this.compactRevision = 0;
    // key -> [{ rev, value, version, createRevision, lease, deleted }]
    this.keys = new Map();
    // Flat event log for watch replay, trimmed by compaction.
    this.events = [];
    // leaseId -> { ttl, expiry, keys: Set }
    this.leases = new Map();
    this.watchers = new Set();
    this.nextWatchId = 1;
  }

  // ---- reads -------------------------------------------------------------

  // etcd's range semantics, which are not obvious from the field names:
  //   rangeEnd empty            -> exactly this key
  //   rangeEnd '\0'             -> every key >= key
  //   key '\0' and rangeEnd '\0'-> every key in the store
  //   otherwise                 -> [key, rangeEnd)
  matchingKeys(key, rangeEnd) {
    let all = [...this.keys.keys()].sort();
    if (!rangeEnd) {
      return this.keys.has(key) ? [key] : [];
    }
    if (rangeEnd === '\0') {
      return key === '\0' ? all : all.filter((k) => k >= key);
    }
    return all.filter((k) => k >= key && k < rangeEnd);
  }

  // The entry live at `rev` (0 meaning "now"), or null if the key did not
  // exist then -- either because it hadn't been written or because it had been
  // deleted.
  entryAt(key, rev = 0) {
    let chain = this.keys.get(key);
    if (!chain || !chain.length) {
      return null;
    }
    let entry = null;
    for (const candidate of chain) {
      if (rev && candidate.rev > rev) {
        break;
      }
      entry = candidate;
    }
    if (!entry || entry.deleted) {
      return null;
    }
    return entry;
  }

  kvOf(key, entry) {
    return {
      key,
      value: entry.value,
      createRevision: entry.createRevision,
      modRevision: entry.rev,
      version: entry.version,
      lease: entry.lease || 0,
    };
  }

  range(key, {
    rangeEnd = '', revision = 0, limit = 0, countOnly = false,
    keysOnly = false, sortOrder = 'NONE', sortTarget = 'KEY',
  } = {}) {
    if (revision && revision < 0) {
      revision = 0;
    }
    // A read at a revision that no longer has history is an error, not an
    // approximation. Returning the nearest surviving revision instead is how
    // a client silently misses writes.
    if (revision && revision <= this.compactRevision && revision < this.revision) {
      throw new StoreError('etcdserver: mvcc: required revision has been compacted', 11);
    }
    if (revision > this.revision) {
      throw new StoreError('etcdserver: mvcc: required revision is a future revision', 13);
    }
    let kvs = [];
    for (const candidate of this.matchingKeys(key, rangeEnd)) {
      let entry = this.entryAt(candidate, revision);
      if (entry) {
        kvs.push(this.kvOf(candidate, entry));
      }
    }
    kvs = sortKvs(kvs, sortOrder, sortTarget);
    let count = kvs.length;
    let more = false;
    if (limit > 0 && kvs.length > limit) {
      more = true;
      kvs = kvs.slice(0, limit);
    }
    if (countOnly) {
      kvs = [];
    } else if (keysOnly) {
      kvs = kvs.map((kv) => ({ ...kv, value: Buffer.alloc(0) }));
    }
    return { kvs, count, more, revision: this.revision };
  }

  // ---- writes ------------------------------------------------------------
  //
  // Each of these is one revision. A transaction that writes four keys bumps
  // the revision once, not four times -- that is what makes "the state at
  // revision N" a coherent thing to read.

  putAt(rev, key, value, { lease = 0, ignoreValue = false, ignoreLease = false } = {}) {
    let previous = this.entryAt(key);
    let entry = {
      rev,
      value: ignoreValue && previous ? previous.value : value,
      version: previous ? previous.version + 1 : 1,
      createRevision: previous ? previous.createRevision : rev,
      lease: ignoreLease && previous ? previous.lease : lease,
      deleted: false,
    };
    if (!this.keys.has(key)) {
      this.keys.set(key, []);
    }
    this.keys.get(key).push(entry);
    if (previous && previous.lease) {
      this.leases.get(previous.lease)?.keys.delete(key);
    }
    if (entry.lease) {
      // A put against a lease that doesn't exist is rejected in etcd; the key
      // would otherwise outlive the lease it claims to be attached to.
      let lease = this.leases.get(entry.lease);
      if (!lease) {
        this.keys.get(key).pop();
        throw new StoreError('etcdserver: requested lease not found', 15);
      }
      lease.keys.add(key);
    }
    let event = {
      rev,
      type: 'PUT',
      kv: this.kvOf(key, entry),
      prevKv: previous ? this.kvOf(key, previous) : null,
    };
    this.events.push(event);
    return event;
  }

  deleteAt(rev, key, rangeEnd = '') {
    let deleted = [];
    for (const candidate of this.matchingKeys(key, rangeEnd)) {
      let previous = this.entryAt(candidate);
      if (!previous) {
        continue;
      }
      this.keys.get(candidate).push({
        rev, value: Buffer.alloc(0), version: 0, createRevision: 0, lease: 0, deleted: true,
      });
      if (previous.lease) {
        this.leases.get(previous.lease)?.keys.delete(candidate);
      }
      let event = { rev, type: 'DELETE', kv: { key: candidate, modRevision: rev }, prevKv: this.kvOf(candidate, previous) };
      this.events.push(event);
      deleted.push(event);
    }
    return deleted;
  }

  // ---- transactions ------------------------------------------------------
  //
  // This is the operation the API server actually depends on. "Write this
  // object only if its modRevision is still what I read" is how optimistic
  // concurrency -- a 409 Conflict on resourceVersion -- is implemented, and a
  // store that can't do the compare atomically can't offer it.

  compare(cmp) {
    let entry = this.entryAt(cmp.key);
    let actual;
    switch (cmp.target) {
      case 'VALUE': actual = entry ? entry.value : Buffer.alloc(0); break;
      case 'CREATE': actual = entry ? entry.createRevision : 0; break;
      case 'MOD': actual = entry ? entry.rev : 0; break;
      case 'LEASE': actual = entry ? entry.lease : 0; break;
      case 'VERSION':
      default: actual = entry ? entry.version : 0; break;
    }
    let expected = cmp.target === 'VALUE' ? fromCommand(cmp.value) : Number(
      cmp.version ?? cmp.createRevision ?? cmp.modRevision ?? cmp.lease ?? 0,
    );
    let ordering = cmp.target === 'VALUE'
      ? Buffer.compare(toBuffer(actual), expected)
      : Math.sign(actual - expected);
    switch (cmp.result) {
      case 'GREATER': return ordering > 0;
      case 'LESS': return ordering < 0;
      case 'NOT_EQUAL': return ordering !== 0;
      case 'EQUAL':
      default: return ordering === 0;
    }
  }

  // Applies one committed command. `rev` is allocated here so that the caller
  // (the Raft apply loop) never has to; two replicas applying the same log
  // index therefore agree on the revision a write landed at.
  apply(cmd) {
    switch (cmd.op) {
      case 'put': return this.applyWrites([cmd]);
      case 'deleteRange': return this.applyWrites([cmd]);
      case 'txn': return this.applyTxn(cmd);
      case 'compact': return this.applyCompact(cmd);
      case 'leaseGrant': return this.applyLeaseGrant(cmd);
      case 'leaseRevoke': return this.applyLeaseRevoke(cmd);
      case 'leaseKeepAlive': return this.applyLeaseKeepAlive(cmd);
      case 'seed': return this.applySeed(cmd);
      case 'noop': return { revision: this.revision };
      default: throw new StoreError(`etcdserver: unknown operation ${cmd.op}`, 3);
    }
  }

  // One revision covers the whole batch, and nothing is published to watchers
  // until every write in it has succeeded -- a batch that throws halfway
  // through must not leave a half-applied revision visible.
  applyWrites(ops) {
    let rev = this.revision + 1;
    let mark = this.events.length;
    let responses = [];
    try {
      for (const op of ops) {
        if (op.op === 'put') {
          let event = this.putAt(rev, op.key, fromCommand(op.value), op);
          responses.push({ type: 'put', prevKv: op.prevKv ? event.prevKv : null });
        } else if (op.op === 'deleteRange') {
          let events = this.deleteAt(rev, op.key, op.rangeEnd);
          responses.push({
            type: 'deleteRange',
            deleted: events.length,
            prevKvs: op.prevKv ? events.map((e) => e.prevKv) : [],
          });
        } else if (op.op === 'range') {
          responses.push({ type: 'range', ...this.range(op.key, op) });
        } else {
          throw new StoreError(`etcdserver: unknown operation ${op.op}`, 3);
        }
      }
    } catch (e) {
      this.rollback(mark, rev);
      throw e;
    }
    let published = this.events.slice(mark);
    if (published.length) {
      this.revision = rev;
      this.publish(published);
    }
    return { revision: this.revision, responses };
  }

  rollback(mark, rev) {
    for (const event of this.events.slice(mark)) {
      let chain = this.keys.get(event.kv.key);
      if (chain && chain.length && chain[chain.length - 1].rev === rev) {
        chain.pop();
      }
    }
    this.events.length = mark;
  }

  applyTxn(cmd) {
    let succeeded = (cmd.compare || []).every((cmp) => this.compare(cmp));
    let ops = (succeeded ? cmd.success : cmd.failure) || [];
    // Reads inside a transaction see the revision the transaction produced,
    // and a read-only transaction doesn't consume a revision at all.
    let result = this.applyWrites(ops);
    return { succeeded, revision: this.revision, responses: result.responses };
  }

  // Move the revision forward to at least `revision`, never back. This exists
  // for one situation: a store adopting a keyspace whose versions were handed
  // out by something else. Resuming below the highest number a client has
  // already seen would reissue it, and a watch resuming from that number would
  // silently skip everything in between.
  applySeed(cmd) {
    this.revision = Math.max(this.revision, Number(cmd.revision) || 0);
    return { revision: this.revision };
  }

  applyCompact(cmd) {
    let target = Number(cmd.revision);
    if (target > this.revision) {
      throw new StoreError('etcdserver: mvcc: required revision is a future revision', 13);
    }
    if (target <= this.compactRevision) {
      throw new StoreError('etcdserver: mvcc: required revision has been compacted', 11);
    }
    this.compactRevision = target;
    for (const [key, chain] of this.keys) {
      // Keep the newest entry at or below the compact point -- it is still the
      // live value -- and drop everything older.
      let keepFrom = 0;
      for (let i = 0; i < chain.length; i++) {
        if (chain[i].rev <= target) {
          keepFrom = i;
        }
      }
      let kept = chain.slice(keepFrom);
      if (kept.length === 1 && kept[0].deleted) {
        this.keys.delete(key);
      } else {
        this.keys.set(key, kept);
      }
    }
    this.events = this.events.filter((e) => e.rev > target);
    return { revision: this.revision, compactRevision: this.compactRevision };
  }

  // ---- leases ------------------------------------------------------------

  applyLeaseGrant(cmd) {
    let id = Number(cmd.id) || this.nextLeaseId(cmd);
    this.leases.set(id, { id, ttl: Number(cmd.ttl), expiry: Number(cmd.expiry), keys: new Set() });
    return { id, ttl: Number(cmd.ttl), revision: this.revision };
  }

  // Lease ids have to be identical on every replica, so they are derived from
  // the log rather than randomly generated: the proposer stamps the command
  // with the index it was assigned.
  nextLeaseId(cmd) {
    return Number(cmd.index) || (this.leases.size + 1);
  }

  applyLeaseRevoke(cmd) {
    let id = Number(cmd.id);
    let lease = this.leases.get(id);
    if (!lease) {
      throw new StoreError('etcdserver: requested lease not found', 15);
    }
    let keys = [...lease.keys];
    this.leases.delete(id);
    if (keys.length) {
      let rev = this.revision + 1;
      let mark = this.events.length;
      for (const key of keys) {
        this.deleteAt(rev, key);
      }
      let published = this.events.slice(mark);
      if (published.length) {
        this.revision = rev;
        this.publish(published);
      }
    }
    return { revision: this.revision, id };
  }

  applyLeaseKeepAlive(cmd) {
    let lease = this.leases.get(Number(cmd.id));
    if (!lease) {
      throw new StoreError('etcdserver: requested lease not found', 15);
    }
    lease.expiry = Number(cmd.expiry);
    return { id: lease.id, ttl: lease.ttl, revision: this.revision };
  }

  expiredLeases(now) {
    return [...this.leases.values()].filter((l) => l.expiry && l.expiry <= now).map((l) => l.id);
  }

  // ---- watch -------------------------------------------------------------

  // A watch from a past revision replays history first and only then goes
  // live, with no gap in between: the replay and the subscription are
  // installed in the same tick, which is what lets a client that reconnects
  // with an old resourceVersion be brought up to date without missing writes.
  watch(key, { rangeEnd = '', startRevision = 0, prevKv = false } = {}) {
    if (startRevision && startRevision <= this.compactRevision) {
      throw new StoreError('etcdserver: mvcc: required revision has been compacted', 11);
    }
    let id = this.nextWatchId++;
    let watcher = {
      id, key, rangeEnd, prevKv, listeners: [],
      on(cb) { this.listeners.push(cb); return this; },
    };
    this.watchers.add(watcher);
    let backlog = startRevision
      ? this.events.filter((e) => e.rev >= startRevision && this.covers(watcher, e.kv.key))
      : [];
    return {
      id,
      backlog: backlog.map((e) => this.shape(watcher, e)),
      on: (cb) => { watcher.listeners.push(cb); },
      cancel: () => this.watchers.delete(watcher),
    };
  }

  covers(watcher, key) {
    if (!watcher.rangeEnd) {
      return key === watcher.key;
    }
    if (watcher.rangeEnd === '\0') {
      return watcher.key === '\0' || key >= watcher.key;
    }
    return key >= watcher.key && key < watcher.rangeEnd;
  }

  shape(watcher, event) {
    return watcher.prevKv ? event : { ...event, prevKv: null };
  }

  publish(events) {
    for (const watcher of this.watchers) {
      let mine = events.filter((e) => this.covers(watcher, e.kv.key)).map((e) => this.shape(watcher, e));
      if (!mine.length) {
        continue;
      }
      for (const listener of watcher.listeners) {
        listener(mine, this.revision);
      }
    }
  }

  // ---- snapshots ---------------------------------------------------------
  //
  // Buffers don't survive JSON, and a snapshot that turns a value into
  // "[object Object]" is worse than no snapshot: it restores cleanly and
  // serves garbage. Values go to base64 explicitly, both ways.

  snapshot() {
    return {
      revision: this.revision,
      compactRevision: this.compactRevision,
      keys: [...this.keys].map(([key, chain]) => [key, chain.map((e) => ({
        ...e, value: toBuffer(e.value).toString('base64'),
      }))]),
      events: this.events.map((e) => ({
        ...e,
        kv: e.kv ? { ...e.kv, value: e.kv.value === undefined ? undefined : toBuffer(e.kv.value).toString('base64') } : null,
        prevKv: e.prevKv ? { ...e.prevKv, value: toBuffer(e.prevKv.value).toString('base64') } : null,
      })),
      leases: [...this.leases.values()].map((l) => ({ ...l, keys: [...l.keys] })),
    };
  }

  restore(snapshot) {
    this.revision = snapshot.revision || 0;
    this.compactRevision = snapshot.compactRevision || 0;
    this.keys = new Map((snapshot.keys || []).map(([key, chain]) => [key, chain.map((e) => ({
      ...e, value: Buffer.from(e.value || '', 'base64'),
    }))]));
    this.events = (snapshot.events || []).map((e) => ({
      ...e,
      kv: e.kv ? { ...e.kv, value: e.kv.value === undefined ? undefined : Buffer.from(e.kv.value, 'base64') } : null,
      prevKv: e.prevKv ? { ...e.prevKv, value: Buffer.from(e.prevKv.value || '', 'base64') } : null,
    }));
    this.leases = new Map((snapshot.leases || []).map((l) => [l.id, { ...l, keys: new Set(l.keys) }]));
    return this;
  }
}

// etcd reports failures as a code plus a message, and clients switch on the
// code -- notably 11 (compacted), which is what tells a watcher to relist.
class StoreError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

// Values inside a command have been through JSON -- they travelled to the
// other replicas as text -- so they arrive base64-encoded. Reading one as a
// plain string would store the encoding instead of the value, and it would
// read back as something that looks almost right.
function fromCommand(value) {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  return Buffer.from(value || '', 'base64');
}

function toBuffer(value) {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return Buffer.alloc(0);
  }
  return Buffer.from(`${value}`);
}

function sortKvs(kvs, order, target) {
  if (order === 'NONE' || !order) {
    return kvs.sort((a, b) => (a.key < b.key ? -1 : 1));
  }
  let field = {
    KEY: (kv) => kv.key,
    VERSION: (kv) => kv.version,
    CREATE: (kv) => kv.createRevision,
    MOD: (kv) => kv.modRevision,
    VALUE: (kv) => toBuffer(kv.value).toString(),
  }[target] || ((kv) => kv.key);
  let sorted = kvs.sort((a, b) => (field(a) < field(b) ? -1 : field(a) > field(b) ? 1 : 0));
  return order === 'DESCEND' ? sorted.reverse() : sorted;
}

module.exports = { Store, StoreError, toBuffer, fromCommand };
