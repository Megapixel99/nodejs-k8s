// Raft, in the shape the paper describes: leader election, log replication,
// and an apply loop that hands committed entries to a state machine.
//
// The reason a fake API server wants this at all is not high availability --
// nobody runs three replicas of a test fixture for uptime. It is that Raft is
// what makes the revision order *a fact* rather than an artefact of whichever
// write happened to reach the database first. Every mutation is proposed as a
// log entry, and the log index decides the order, so two clients racing on the
// same key get a deterministic winner and the loser gets a conflict it can act
// on.
//
// A single-node cluster is the normal case here and takes the same path: it is
// a majority of one, so entries commit as soon as they are durable.
const { Wal } = require('./wal.js');

const FOLLOWER = 'follower';
const CANDIDATE = 'candidate';
const LEADER = 'leader';

class Raft {
  constructor({
    id, peers = [], dir, apply, transport,
    heartbeatInterval = 120, electionTimeout = 500, snapshotEvery = 500, sync = true,
  }) {
    this.id = id;
    this.peers = peers.filter((p) => p.id !== id);
    this.apply = apply;
    this.transport = transport;
    this.wal = new Wal(dir, { sync });
    this.heartbeatInterval = heartbeatInterval;
    this.electionTimeout = electionTimeout;
    this.snapshotEvery = snapshotEvery;

    this.currentTerm = 0;
    this.votedFor = null;
    this.log = [];
    this.snapshotIndex = 0;
    this.snapshotTerm = 0;
    this.commitIndex = 0;
    this.lastApplied = 0;
    this.role = FOLLOWER;
    this.leaderId = null;
    this.nextIndex = new Map();
    this.matchIndex = new Map();
    this.pending = new Map();
    this.timers = {};
    this.stopped = false;
    this.listeners = { leader: [], apply: [] };
  }

  on(event, cb) {
    (this.listeners[event] = this.listeners[event] || []).push(cb);
    return this;
  }

  emit(event, ...args) {
    for (const cb of this.listeners[event] || []) {
      cb(...args);
    }
  }

  // ---- lifecycle ---------------------------------------------------------

  async start({ restore } = {}) {
    let state = this.wal.loadState();
    this.currentTerm = state.currentTerm || 0;
    this.votedFor = state.votedFor ?? null;

    let snapshot = this.wal.loadSnapshot();
    if (snapshot) {
      this.snapshotIndex = snapshot.index;
      this.snapshotTerm = snapshot.term;
      this.commitIndex = snapshot.index;
      this.lastApplied = snapshot.index;
      if (restore) {
        restore(snapshot.state);
      }
    }
    // Entries the snapshot already covers are dead weight; a restart that
    // replayed them would apply the same writes twice.
    this.log = this.wal.read().filter((e) => e.index > this.snapshotIndex);
    this.applyCommitted();
    this.resetElectionTimer();
    return this;
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timers.election);
    clearInterval(this.timers.heartbeat);
    for (const [, waiter] of this.pending) {
      waiter.reject(new Error('etcdserver: server stopped'));
    }
    this.pending.clear();
  }

  persistState() {
    this.wal.saveState({ currentTerm: this.currentTerm, votedFor: this.votedFor });
  }

  // ---- log helpers -------------------------------------------------------

  get lastIndex() {
    return this.log.length ? this.log[this.log.length - 1].index : this.snapshotIndex;
  }

  get lastTerm() {
    return this.log.length ? this.log[this.log.length - 1].term : this.snapshotTerm;
  }

  entryAt(index) {
    if (index === this.snapshotIndex) {
      return { index, term: this.snapshotTerm };
    }
    return this.log.find((e) => e.index === index);
  }

  quorum() {
    return Math.floor((this.peers.length + 1) / 2) + 1;
  }

  // ---- elections ---------------------------------------------------------

  // The timeout is randomised per reset, not per node: two nodes that start
  // together and use a fixed timeout will keep timing out together and split
  // the vote forever.
  resetElectionTimer() {
    clearTimeout(this.timers.election);
    if (this.stopped) {
      return;
    }
    let jitter = this.electionTimeout + Math.floor(Math.random() * this.electionTimeout);
    this.timers.election = setTimeout(() => this.startElection(), jitter);
    this.timers.election.unref?.();
  }

  becomeFollower(term) {
    let changed = this.role !== FOLLOWER;
    this.role = FOLLOWER;
    // Anything this node proposed and hasn't committed is now somebody else's
    // to decide. It may still commit under the new leader, but this node can
    // no longer say so -- and a caller left waiting on a promise that will
    // never settle is a hung API request, which is worse than a retry.
    if (changed) {
      for (const [index, waiter] of this.pending) {
        let error = new Error('etcdserver: leader changed, retry the request');
        error.code = 'NOT_LEADER';
        waiter.reject(error);
        this.pending.delete(index);
      }
    }
    if (term > this.currentTerm) {
      this.currentTerm = term;
      this.votedFor = null;
      this.persistState();
    }
    clearInterval(this.timers.heartbeat);
    this.resetElectionTimer();
    if (changed) {
      this.emit('leader', this.leaderId);
    }
  }

  async startElection() {
    if (this.stopped) {
      return;
    }
    // A cluster of one has nobody to ask; it is the leader the moment it wants
    // to be, and waiting on an election timeout would just add latency to
    // every restart.
    this.role = CANDIDATE;
    this.currentTerm += 1;
    this.votedFor = this.id;
    this.leaderId = null;
    this.persistState();
    this.resetElectionTimer();

    let term = this.currentTerm;
    let votes = 1;
    if (votes >= this.quorum()) {
      return this.becomeLeader();
    }
    for (const peer of this.peers) {
      this.transport.send(peer, 'vote', {
        term,
        candidateId: this.id,
        lastLogIndex: this.lastIndex,
        lastLogTerm: this.lastTerm,
      }).then((reply) => {
        if (!reply || this.role !== CANDIDATE || this.currentTerm !== term) {
          return;
        }
        if (reply.term > this.currentTerm) {
          return this.becomeFollower(reply.term);
        }
        if (reply.voteGranted) {
          votes += 1;
          if (votes >= this.quorum()) {
            this.becomeLeader();
          }
        }
      }).catch(() => {});
    }
  }

  handleVote({ term, candidateId, lastLogIndex, lastLogTerm }) {
    if (term > this.currentTerm) {
      this.becomeFollower(term);
    }
    let upToDate = lastLogTerm > this.lastTerm
      || (lastLogTerm === this.lastTerm && lastLogIndex >= this.lastIndex);
    let granted = term >= this.currentTerm
      && (this.votedFor === null || this.votedFor === candidateId)
      && upToDate;
    if (granted) {
      this.votedFor = candidateId;
      this.persistState();
      this.resetElectionTimer();
    }
    return { term: this.currentTerm, voteGranted: granted };
  }

  becomeLeader() {
    if (this.role === LEADER) {
      return;
    }
    this.role = LEADER;
    this.leaderId = this.id;
    this.nextIndex = new Map(this.peers.map((p) => [p.id, this.lastIndex + 1]));
    this.matchIndex = new Map(this.peers.map((p) => [p.id, 0]));
    clearTimeout(this.timers.election);
    clearInterval(this.timers.heartbeat);
    this.timers.heartbeat = setInterval(() => this.replicate(), this.heartbeatInterval);
    this.timers.heartbeat.unref?.();
    // A new leader may hold committed-but-unapplied entries from an earlier
    // term that it cannot commit by counting replicas alone. Appending one
    // entry of its own term and committing that carries them along with it.
    this.appendLocal({ op: 'noop' }).catch(() => {});
    this.emit('leader', this.id);
    this.replicate();
  }

  // ---- replication -------------------------------------------------------

  appendLocal(cmd) {
    let entry = { term: this.currentTerm, index: this.lastIndex + 1, cmd };
    this.log.push(entry);
    this.wal.append([entry]);
    let waiter = new Promise((resolve, reject) => {
      this.pending.set(entry.index, { resolve, reject, term: entry.term });
    });
    if (this.quorum() === 1) {
      this.commitIndex = entry.index;
      this.applyCommitted();
    } else {
      this.replicate();
    }
    return waiter;
  }

  // Writes go through the leader. A follower that accepted one locally would
  // be inventing an order nobody else agreed to, so it says who the leader is
  // and lets the caller forward.
  propose(cmd) {
    if (this.role !== LEADER) {
      let error = new Error('etcdserver: not leader');
      error.code = 'NOT_LEADER';
      error.leaderId = this.leaderId;
      return Promise.reject(error);
    }
    return this.appendLocal(cmd);
  }

  replicate() {
    if (this.role !== LEADER || this.stopped) {
      return;
    }
    for (const peer of this.peers) {
      let next = this.nextIndex.get(peer.id) ?? this.lastIndex + 1;
      let prevIndex = next - 1;
      let prev = this.entryAt(prevIndex);
      // The follower is behind the snapshot: the entries it needs are gone,
      // so send the state instead of the log.
      if (prevIndex < this.snapshotIndex || (!prev && prevIndex !== 0)) {
        this.sendSnapshot(peer);
        continue;
      }
      let entries = this.log.filter((e) => e.index >= next);
      this.transport.send(peer, 'append', {
        term: this.currentTerm,
        leaderId: this.id,
        prevLogIndex: prevIndex,
        prevLogTerm: prevIndex === 0 ? 0 : (prev?.term ?? this.snapshotTerm),
        entries,
        leaderCommit: this.commitIndex,
      }).then((reply) => {
        if (!reply || this.role !== LEADER) {
          return;
        }
        if (reply.term > this.currentTerm) {
          return this.becomeFollower(reply.term);
        }
        if (reply.success) {
          let match = prevIndex + entries.length;
          this.matchIndex.set(peer.id, Math.max(this.matchIndex.get(peer.id) ?? 0, match));
          this.nextIndex.set(peer.id, match + 1);
          this.advanceCommit();
        } else {
          // conflictIndex lets a follower that is far behind catch up in one
          // round trip instead of one entry per heartbeat.
          this.nextIndex.set(peer.id, Math.max(1, reply.conflictIndex ?? next - 1));
        }
      }).catch(() => {});
    }
  }

  sendSnapshot(peer) {
    let snapshot = this.wal.loadSnapshot();
    if (!snapshot) {
      this.nextIndex.set(peer.id, 1);
      return;
    }
    this.transport.send(peer, 'snapshot', {
      term: this.currentTerm, leaderId: this.id, snapshot,
    }).then((reply) => {
      if (!reply || this.role !== LEADER) {
        return;
      }
      if (reply.term > this.currentTerm) {
        return this.becomeFollower(reply.term);
      }
      this.matchIndex.set(peer.id, snapshot.index);
      this.nextIndex.set(peer.id, snapshot.index + 1);
    }).catch(() => {});
  }

  // An entry is committed once a majority stores it -- but only if it is from
  // the current term. Committing an older entry on replica count alone is the
  // bug Figure 8 of the Raft paper exists to warn about.
  advanceCommit() {
    for (let n = this.lastIndex; n > this.commitIndex; n--) {
      let entry = this.entryAt(n);
      if (!entry || entry.term !== this.currentTerm) {
        continue;
      }
      let replicas = 1 + [...this.matchIndex.values()].filter((m) => m >= n).length;
      if (replicas >= this.quorum()) {
        this.commitIndex = n;
        this.applyCommitted();
        return;
      }
    }
  }

  handleAppend({ term, leaderId, prevLogIndex, prevLogTerm, entries = [], leaderCommit }) {
    if (term < this.currentTerm) {
      return { term: this.currentTerm, success: false };
    }
    if (term > this.currentTerm || this.role !== FOLLOWER) {
      this.becomeFollower(term);
    }
    this.leaderId = leaderId;
    this.resetElectionTimer();

    if (prevLogIndex > 0 && prevLogIndex !== this.snapshotIndex) {
      let prev = this.entryAt(prevLogIndex);
      if (!prev || prev.term !== prevLogTerm) {
        // Point the leader at the start of the conflicting term rather than
        // backing up one index at a time.
        let conflictIndex = prev
          ? Math.min(...this.log.filter((e) => e.term === prev.term).map((e) => e.index))
          : this.lastIndex + 1;
        return { term: this.currentTerm, success: false, conflictIndex: Math.max(1, conflictIndex) };
      }
    }

    if (entries.length) {
      // Truncate only where the logs actually diverge: a heartbeat that
      // repeats entries the follower already has must not drop and re-add
      // them, because entries after them may already be committed.
      let divergesAt = null;
      for (const entry of entries) {
        let existing = this.entryAt(entry.index);
        if (existing && existing.term !== entry.term) {
          divergesAt = entry.index;
          break;
        }
        if (!existing) {
          divergesAt = entry.index;
          break;
        }
      }
      if (divergesAt !== null) {
        this.log = this.log.filter((e) => e.index < divergesAt);
        this.log.push(...entries.filter((e) => e.index >= divergesAt));
        this.wal.rewrite(this.log);
      }
    }

    if (leaderCommit > this.commitIndex) {
      this.commitIndex = Math.min(leaderCommit, this.lastIndex);
      this.applyCommitted();
    }
    return { term: this.currentTerm, success: true, matchIndex: this.lastIndex };
  }

  handleSnapshot({ term, leaderId, snapshot }, restore) {
    if (term < this.currentTerm) {
      return { term: this.currentTerm, success: false };
    }
    this.becomeFollower(term);
    this.leaderId = leaderId;
    this.wal.saveSnapshot(snapshot);
    this.snapshotIndex = snapshot.index;
    this.snapshotTerm = snapshot.term;
    this.commitIndex = snapshot.index;
    this.lastApplied = snapshot.index;
    this.log = this.log.filter((e) => e.index > snapshot.index);
    this.wal.rewrite(this.log);
    restore?.(snapshot.state);
    return { term: this.currentTerm, success: true };
  }

  // ---- apply -------------------------------------------------------------

  // A command that fails deterministically (a compare against a compacted
  // revision, say) is still a committed log entry: every replica applies it
  // and every replica records the same failure. The error goes to the caller,
  // not to the log.
  applyCommitted() {
    while (this.lastApplied < this.commitIndex) {
      this.lastApplied += 1;
      let entry = this.entryAt(this.lastApplied);
      if (!entry || !entry.cmd) {
        continue;
      }
      let waiter = this.pending.get(entry.index);
      this.pending.delete(entry.index);
      let result;
      let failure = null;
      try {
        result = this.apply({ ...entry.cmd, index: entry.index }, entry.index);
      } catch (e) {
        failure = e;
      }
      this.emit('apply', entry, result, failure);
      if (waiter) {
        // A leader that lost its term before the entry committed may have had
        // this index overwritten; the waiter is resolved by index and term
        // together so it can't be handed someone else's result.
        if (waiter.term !== entry.term) {
          let error = new Error('etcdserver: request timed out, possibly due to previous leader failure');
          error.code = 'NOT_LEADER';
          waiter.reject(error);
        } else if (failure) {
          waiter.reject(failure);
        } else {
          waiter.resolve(result);
        }
      }
      this.maybeSnapshot();
    }
  }

  maybeSnapshot() {
    if (this.lastApplied - this.snapshotIndex < this.snapshotEvery) {
      return;
    }
    this.takeSnapshot();
  }

  takeSnapshot() {
    let entry = this.entryAt(this.lastApplied);
    if (!entry) {
      return;
    }
    this.wal.saveSnapshot({
      index: this.lastApplied,
      term: entry.term,
      state: this.snapshotState ? this.snapshotState() : null,
    });
    this.snapshotIndex = this.lastApplied;
    this.snapshotTerm = entry.term;
    this.log = this.log.filter((e) => e.index > this.snapshotIndex);
    this.wal.rewrite(this.log);
  }

  status() {
    return {
      id: this.id,
      role: this.role,
      term: this.currentTerm,
      leaderId: this.leaderId,
      commitIndex: this.commitIndex,
      lastApplied: this.lastApplied,
      lastIndex: this.lastIndex,
      peers: this.peers.map((p) => p.id),
    };
  }
}

module.exports = { Raft, FOLLOWER, CANDIDATE, LEADER };
