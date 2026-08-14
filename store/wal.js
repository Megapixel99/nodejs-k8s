// Durability for the Raft log.
//
// Raft's safety argument rests on two things surviving a crash: the term the
// replica last voted in, and the log entries it told the leader it had. If
// either is lost, a replica can vote twice in one term or acknowledge an entry
// it no longer has, and the cluster can lose a committed write. So both are
// written and fsynced before anything is acknowledged.
//
// The log is JSON lines rather than a packed binary format: a torn tail is
// detectable (the line won't parse) and recoverable by discarding it, which is
// exactly what a crash mid-append leaves behind.
const fs = require('fs');
const path = require('path');

class Wal {
  constructor(dir, { sync = true } = {}) {
    this.dir = dir;
    this.sync = sync;
    this.logPath = path.join(dir, 'raft.log');
    this.statePath = path.join(dir, 'raft.state');
    this.snapshotPath = path.join(dir, 'raft.snapshot');
    fs.mkdirSync(dir, { recursive: true });
  }

  writeFileSynced(file, contents) {
    // Writing in place would leave a truncated file if the process dies
    // mid-write, and a half-written state file is unreadable rather than
    // stale. Write beside it and rename, which is atomic.
    let temp = `${file}.tmp`;
    let fd = fs.openSync(temp, 'w');
    try {
      fs.writeFileSync(fd, contents);
      if (this.sync) {
        fs.fsyncSync(fd);
      }
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(temp, file);
  }

  loadState() {
    try {
      return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
    } catch (e) {
      return { currentTerm: 0, votedFor: null };
    }
  }

  saveState(state) {
    this.writeFileSynced(this.statePath, JSON.stringify(state));
  }

  append(entries) {
    if (!entries.length) {
      return;
    }
    let payload = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    let fd = fs.openSync(this.logPath, 'a');
    try {
      fs.writeSync(fd, payload);
      if (this.sync) {
        fs.fsyncSync(fd);
      }
    } finally {
      fs.closeSync(fd);
    }
  }

  // A line that doesn't parse is a partial write from a crash. Everything
  // after it is unreachable anyway -- the log is a sequence -- so recovery
  // stops there rather than trying to salvage later lines.
  read() {
    let raw;
    try {
      raw = fs.readFileSync(this.logPath, 'utf8');
    } catch (e) {
      return [];
    }
    let entries = [];
    for (const line of raw.split('\n')) {
      if (!line) {
        continue;
      }
      try {
        entries.push(JSON.parse(line));
      } catch (e) {
        break;
      }
    }
    return entries;
  }

  // Raft tells a follower to drop entries that conflict with the leader's log.
  // Rewriting the file is heavy-handed but honest; the alternative is tracking
  // byte offsets, and getting those wrong corrupts the log silently.
  rewrite(entries) {
    this.writeFileSynced(this.logPath, entries.map((e) => JSON.stringify(e)).join('\n') + (entries.length ? '\n' : ''));
  }

  saveSnapshot(snapshot) {
    this.writeFileSynced(this.snapshotPath, JSON.stringify(snapshot));
  }

  loadSnapshot() {
    try {
      return JSON.parse(fs.readFileSync(this.snapshotPath, 'utf8'));
    } catch (e) {
      return null;
    }
  }
}

module.exports = { Wal };
