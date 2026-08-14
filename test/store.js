// The store, tested the way a client experiences it.
//
// A key/value store is easy to test into a false sense of security: write a
// key, read it back, everything passes. The properties that actually matter
// here are the ones a naive implementation gets wrong while still returning
// the right value for that trivial case -- that a revision orders writes
// across unrelated keys, that a compare-and-swap loses cleanly under a race,
// that a read at an old revision is refused rather than approximated once the
// history is gone, and that a restart doesn't quietly forget the last write it
// acknowledged.
//
// Needs no server and no database: every node here is created in a temporary
// directory and torn down at the end.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { StoreNode } = require('../store/node.js');
const { Gateway } = require('../store/gateway.js');

let fails = [];
let passes = 0;

function check(name, condition, got) {
  if (condition) {
    passes++;
    return;
  }
  fails.push(`${name} -> got ${JSON.stringify(got)}`);
}

const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const text = (kv) => Buffer.from(kv.value).toString();

let roots = [];
function tempDir(name) {
  let dir = fs.mkdtempSync(path.join(os.tmpdir(), `k8s-store-${name}-`));
  roots.push(dir);
  return dir;
}

async function single(name, options = {}) {
  let node = new StoreNode({
    id: name,
    dir: tempDir(name),
    address: `http://127.0.0.1:${options.port || 0}`,
    peers: [],
    sync: false,
    ...options,
  });
  await node.start();
  await node.waitForLeader();
  return node;
}

(async () => {
  // ---- revisions ---------------------------------------------------------
  let node = await single('kv', { port: 23811 });

  let first = await node.put('/registry/pods/default/a', 'one');
  let second = await node.put('/registry/pods/default/b', 'two');
  check('a write returns the revision it landed at', first.revision === 1, first.revision);
  // The revision is global, not per-key: two unrelated writes are still
  // ordered against each other, which is what lets a watch resume from a
  // single number.
  check('unrelated writes share one increasing sequence', second.revision === 2, second.revision);

  let got = await node.range('/registry/pods/default/a');
  check('a key reads back', text(got.kvs[0]) === 'one', got.kvs[0] && text(got.kvs[0]));
  check('a first write has version 1', got.kvs[0].version === 1, got.kvs[0].version);
  check('createRevision is where the key appeared', got.kvs[0].createRevision === 1, got.kvs[0].createRevision);

  let updated = await node.put('/registry/pods/default/a', 'one-updated');
  let reread = await node.range('/registry/pods/default/a');
  check('an update bumps version', reread.kvs[0].version === 2, reread.kvs[0].version);
  check('an update moves modRevision', reread.kvs[0].modRevision === updated.revision, reread.kvs[0].modRevision);
  check('an update leaves createRevision alone', reread.kvs[0].createRevision === 1, reread.kvs[0].createRevision);

  // ---- ranges ------------------------------------------------------------
  await node.put('/registry/pods/other/c', 'three');
  await node.put('/registry/services/default/d', 'four');

  let prefix = await node.range('/registry/pods/', { rangeEnd: '/registry/pods0' });
  check('a prefix range spans namespaces', prefix.kvs.length === 3, prefix.kvs.map((kv) => kv.key));
  check('a prefix range stops at the prefix', prefix.kvs.every((kv) => kv.key.startsWith('/registry/pods/')), prefix.kvs.map((kv) => kv.key));
  check('range results are sorted by key',
    prefix.kvs.map((kv) => kv.key).join() === [...prefix.kvs.map((kv) => kv.key)].sort().join(),
    prefix.kvs.map((kv) => kv.key));

  let limited = await node.range('/registry/pods/', { rangeEnd: '/registry/pods0', limit: 2 });
  check('limit truncates', limited.kvs.length === 2, limited.kvs.length);
  // `more` is how a paginating client knows to ask again. Reporting the
  // truncated length as the count would tell it the opposite.
  check('limit reports there is more', limited.more === true, limited.more);
  check('count is the untruncated total', limited.count === 3, limited.count);

  let counted = await node.range('/registry/', { rangeEnd: '/registry0', countOnly: true });
  check('countOnly returns no values', counted.kvs.length === 0, counted.kvs.length);
  check('countOnly still counts', counted.count === 4, counted.count);

  let keysOnly = await node.range('/registry/pods/', { rangeEnd: '/registry/pods0', keysOnly: true });
  check('keysOnly drops the values', keysOnly.kvs.every((kv) => kv.value.length === 0), keysOnly.kvs.map((kv) => kv.value.length));

  let descending = await node.range('/registry/pods/', { rangeEnd: '/registry/pods0', sortOrder: 'DESCEND', sortTarget: 'KEY' });
  check('descending sort reverses', descending.kvs[0].key > descending.kvs[2].key, descending.kvs.map((kv) => kv.key));

  // ---- history -----------------------------------------------------------
  let old = await node.range('/registry/pods/default/a', { revision: 1 });
  check('a read at an old revision sees the old value', text(old.kvs[0]) === 'one', old.kvs[0] && text(old.kvs[0]));

  let future = await node.range('/registry/pods/default/a', { revision: 9999 }).catch((e) => e);
  check('a read at a future revision is refused', future instanceof Error, future);

  // ---- transactions ------------------------------------------------------
  let current = (await node.range('/registry/pods/default/a')).kvs[0];

  let won = await node.txn({
    compare: [{ key: '/registry/pods/default/a', target: 'MOD', result: 'EQUAL', modRevision: current.modRevision }],
    success: [{ op: 'put', key: '/registry/pods/default/a', value: 'compare-and-swapped' }],
    failure: [{ op: 'range', key: '/registry/pods/default/a' }],
  });
  check('a compare-and-swap on the current revision succeeds', won.succeeded === true, won.succeeded);

  // This is the operation a 409 Conflict is made of: the client read at some
  // revision, someone else wrote, and the write it based on that read has to
  // lose rather than silently overwrite.
  let lost = await node.txn({
    compare: [{ key: '/registry/pods/default/a', target: 'MOD', result: 'EQUAL', modRevision: current.modRevision }],
    success: [{ op: 'put', key: '/registry/pods/default/a', value: 'stale write' }],
    failure: [{ op: 'range', key: '/registry/pods/default/a' }],
  });
  check('a compare-and-swap on a stale revision fails', lost.succeeded === false, lost.succeeded);
  check('the losing branch still returns the current value',
    text(lost.responses[0].kvs[0]) === 'compare-and-swapped', lost.responses[0]?.kvs?.[0] && text(lost.responses[0].kvs[0]));

  let createIfAbsent = await node.txn({
    compare: [{ key: '/registry/pods/default/new', target: 'VERSION', result: 'EQUAL', version: 0 }],
    success: [{ op: 'put', key: '/registry/pods/default/new', value: 'created' }],
    failure: [],
  });
  check('create-if-absent succeeds on a missing key', createIfAbsent.succeeded === true, createIfAbsent.succeeded);
  let createAgain = await node.txn({
    compare: [{ key: '/registry/pods/default/new', target: 'VERSION', result: 'EQUAL', version: 0 }],
    success: [{ op: 'put', key: '/registry/pods/default/new', value: 'created twice' }],
    failure: [],
  });
  check('create-if-absent fails once the key exists', createAgain.succeeded === false, createAgain.succeeded);

  let valueCompare = await node.txn({
    compare: [{ key: '/registry/pods/default/new', target: 'VALUE', result: 'EQUAL', value: 'created' }],
    success: [{ op: 'put', key: '/registry/pods/default/new', value: 'value compare works' }],
    failure: [],
  });
  check('a compare on the value itself works', valueCompare.succeeded === true, valueCompare.succeeded);

  let before = node.store.revision;
  let batch = await node.txn({
    compare: [],
    success: [
      { op: 'put', key: '/registry/batch/1', value: 'x' },
      { op: 'put', key: '/registry/batch/2', value: 'y' },
      { op: 'put', key: '/registry/batch/3', value: 'z' },
    ],
    failure: [],
  });
  // Three keys, one revision. If each write took its own, "the state at
  // revision N" could land in the middle of a transaction.
  check('a transaction is one revision no matter how many writes', batch.revision === before + 1, [before, batch.revision]);

  // ---- deletes -----------------------------------------------------------
  let removed = await node.deleteRange('/registry/batch/1', { prevKv: true });
  check('delete reports how many keys it removed', removed.deleted === 1, removed.deleted);
  check('delete can return what was there', text(removed.prevKvs[0]) === 'x', removed.prevKvs[0] && text(removed.prevKvs[0]));
  let afterDelete = await node.range('/registry/batch/1');
  check('a deleted key is gone', afterDelete.kvs.length === 0, afterDelete.kvs.length);
  let historic = await node.range('/registry/batch/1', { revision: batch.revision });
  check('a deleted key is still readable at its old revision', historic.kvs.length === 1, historic.kvs.length);

  let rangeDelete = await node.deleteRange('/registry/batch/', { rangeEnd: '/registry/batch0' });
  check('a range delete removes the rest', rangeDelete.deleted === 2, rangeDelete.deleted);

  // ---- watch -------------------------------------------------------------
  let live = [];
  let watcher = node.watch('/registry/watched/', { rangeEnd: '/registry/watched0' });
  watcher.on((events) => live.push(...events));
  await node.put('/registry/watched/a', 'w1');
  await node.put('/registry/watched/b', 'w2');
  await node.put('/registry/elsewhere/c', 'ignored');
  await settle(50);
  check('a watch sees writes in its range', live.length === 2, live.map((e) => e.kv.key));
  check('a watch does not see writes outside it',
    live.every((e) => e.kv.key.startsWith('/registry/watched/')), live.map((e) => e.kv.key));
  check('watch events carry the revision', live[0].rev > 0, live[0]?.rev);
  watcher.cancel();

  let deleteEvents = [];
  let deleteWatcher = node.watch('/registry/watched/a', { prevKv: true });
  deleteWatcher.on((events) => deleteEvents.push(...events));
  await node.deleteRange('/registry/watched/a');
  await settle(50);
  check('a watch reports deletes as deletes', deleteEvents[0]?.type === 'DELETE', deleteEvents[0]?.type);
  check('a delete event can carry what was there',
    deleteEvents[0]?.prevKv && text(deleteEvents[0].prevKv) === 'w1', deleteEvents[0]?.prevKv);
  deleteWatcher.cancel();

  // Resuming is the whole point: a client that was disconnected asks for
  // everything since the revision it last saw, and must not have to guess
  // what it missed.
  let resumeFrom = live[0].rev;
  let replayed = node.watch('/registry/watched/', { rangeEnd: '/registry/watched0', startRevision: resumeFrom });
  check('a watch from a past revision replays what it missed', replayed.backlog.length >= 2, replayed.backlog.map((e) => e.kv.key));
  check('the replay starts at the revision asked for',
    replayed.backlog.every((e) => e.rev >= resumeFrom), replayed.backlog.map((e) => e.rev));
  replayed.cancel();

  // ---- compaction --------------------------------------------------------
  let compactAt = node.store.revision;
  await node.compact(compactAt);
  let compacted = await node.range('/registry/pods/default/a', { revision: 1 }).catch((e) => e);
  check('a read below the compact point is refused', compacted instanceof Error, `${compacted}`);
  // Code 11 is the one clients switch on: it is what tells a stale watcher to
  // start over with a fresh list instead of retrying forever.
  check('the refusal carries the compacted code', compacted.code === 11, compacted.code);
  let stillThere = await node.range('/registry/pods/default/a');
  check('compaction keeps the live value', text(stillThere.kvs[0]) === 'compare-and-swapped', stillThere.kvs[0] && text(stillThere.kvs[0]));
  let staleWatch = (() => {
    try {
      return node.watch('/registry/pods/default/a', { startRevision: 1 });
    } catch (e) {
      return e;
    }
  })();
  check('a watch from a compacted revision is refused', staleWatch instanceof Error, `${staleWatch}`);

  // ---- leases ------------------------------------------------------------
  let lease = await node.leaseGrant(1);
  await node.put('/registry/leased/key', 'ephemeral', { lease: lease.id });
  let leased = await node.range('/registry/leased/key');
  check('a leased key is a normal key while the lease lives', leased.kvs.length === 1, leased.kvs.length);
  check('the key reports its lease', leased.kvs[0].lease === lease.id, leased.kvs[0].lease);

  let ttl = node.leaseTimeToLive(lease.id);
  check('a lease reports its remaining ttl', ttl.ttl > 0 && ttl.ttl <= 1, ttl);
  check('a lease reports its keys', ttl.keys.includes('/registry/leased/key'), ttl.keys);

  await node.leaseRevoke(lease.id);
  let revoked = await node.range('/registry/leased/key');
  check('revoking a lease deletes its keys', revoked.kvs.length === 0, revoked.kvs.length);

  let expiring = await node.leaseGrant(1);
  await node.put('/registry/leased/expiring', 'goes away', { lease: expiring.id });
  await settle(1800);
  let expired = await node.range('/registry/leased/expiring');
  check('an expired lease takes its keys with it', expired.kvs.length === 0, expired.kvs.length);

  let orphan = await node.put('/registry/leased/orphan', 'x', { lease: 999999 }).catch((e) => e);
  check('a put against a missing lease is rejected', orphan instanceof Error, `${orphan}`);

  // ---- the etcd endpoint -------------------------------------------------
  //
  // Same store, reached the way etcd's own documentation reaches it. The
  // encoding is the substance here: keys and values are base64 and revisions
  // are strings, and a server that returned them as plain text and numbers
  // would look right in a terminal and break a real client.
  let gatewayNode = await single('gw', { port: 23815 });
  let gateway = new Gateway(gatewayNode, { address: 'http://127.0.0.1:23816' });
  await gateway.listen();
  const etcd = (path, body) => fetch(`http://127.0.0.1:23816${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(async (res) => ({ status: res.status, body: await res.json() }));
  const enc = (v) => Buffer.from(v).toString('base64');
  const dec = (v) => Buffer.from(v || '', 'base64').toString();

  let putResponse = await etcd('/v3/kv/put', { key: enc('/registry/gw/a'), value: enc('through the gateway') });
  check('the etcd endpoint accepts a put', putResponse.status === 200, putResponse.status);
  check('a put answers with a header', Boolean(putResponse.body.header), putResponse.body);
  // int64 as a JSON number loses precision above 2^53, so protobuf's JSON
  // mapping sends it as a string and clients expect one.
  check('revisions come back as strings', typeof putResponse.body.header.revision === 'string', typeof putResponse.body.header.revision);

  let rangeResponse = await etcd('/v3/kv/range', { key: enc('/registry/gw/a') });
  check('the etcd endpoint reads back', dec(rangeResponse.body.kvs?.[0]?.value) === 'through the gateway', rangeResponse.body.kvs?.[0]);
  check('keys come back base64', dec(rangeResponse.body.kvs[0].key) === '/registry/gw/a', rangeResponse.body.kvs[0].key);
  check('counts are strings too', typeof rangeResponse.body.count === 'string', typeof rangeResponse.body.count);

  await etcd('/v3/kv/put', { key: enc('/registry/gw/b'), value: enc('second') });
  let prefixResponse = await etcd('/v3/kv/range', { key: enc('/registry/gw/'), range_end: enc('/registry/gw0') });
  check('the endpoint honours range_end in snake_case', prefixResponse.body.kvs?.length === 2, prefixResponse.body.kvs?.length);
  let camelResponse = await etcd('/v3/kv/range', { key: enc('/registry/gw/'), rangeEnd: enc('/registry/gw0') });
  check('and rangeEnd in camelCase', camelResponse.body.kvs?.length === 2, camelResponse.body.kvs?.length);

  let txnResponse = await etcd('/v3/kv/txn', {
    compare: [{ key: enc('/registry/gw/a'), target: 'VERSION', result: 'EQUAL', version: '1' }],
    success: [{ requestPut: { key: enc('/registry/gw/a'), value: enc('swapped') } }],
    failure: [{ requestRange: { key: enc('/registry/gw/a') } }],
  });
  check('the endpoint runs transactions', txnResponse.body.succeeded === true, txnResponse.body);
  let failedTxn = await etcd('/v3/kv/txn', {
    compare: [{ key: enc('/registry/gw/a'), target: 'VERSION', result: 'EQUAL', version: '1' }],
    success: [{ requestPut: { key: enc('/registry/gw/a'), value: enc('should not happen') } }],
    failure: [{ requestRange: { key: enc('/registry/gw/a') } }],
  });
  check('a failed compare reports the failure branch', failedTxn.body.succeeded === false, failedTxn.body.succeeded);
  check('the failure branch carries its response',
    dec(failedTxn.body.responses?.[0]?.response_range?.kvs?.[0]?.value) === 'swapped',
    failedTxn.body.responses?.[0]);

  let statusResponse = await etcd('/v3/maintenance/status', {});
  check('the endpoint reports raft status', Number(statusResponse.body.raftTerm) >= 1, statusResponse.body);

  let deleteResponse = await etcd('/v3/kv/deleterange', { key: enc('/registry/gw/b'), prev_kv: true });
  check('the endpoint deletes', deleteResponse.body.deleted === '1', deleteResponse.body.deleted);
  check('a delete can return the previous value',
    dec(deleteResponse.body.prev_kvs?.[0]?.value) === 'second', deleteResponse.body.prev_kvs?.[0]);

  let leaseResponse = await etcd('/v3/lease/grant', { TTL: '5' });
  check('the endpoint grants leases', Number(leaseResponse.body.ID) > 0, leaseResponse.body);

  let compactBad = await etcd('/v3/kv/compaction', { revision: '99999' });
  check('a bad compaction is refused with a code, not a crash',
    compactBad.status === 400 && compactBad.body.code === 13, [compactBad.status, compactBad.body]);

  // The watch stream, framed one JSON object per line the way the Kubernetes
  // watch is -- a client reading it should never have to wait for the body to
  // end to see the first event.
  let streamed = [];
  let watchController = new AbortController();
  let stream = fetch('http://127.0.0.1:23816/v3/watch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ createRequest: { key: enc('/registry/gw/watched') } }),
    signal: watchController.signal,
  }).then(async (res) => {
    for await (const chunk of res.body) {
      // fetch hands back Uint8Array chunks, and Uint8Array.toString() is a
      // list of numbers rather than the bytes as text.
      for (const line of Buffer.from(chunk).toString().split('\n').filter(Boolean)) {
        streamed.push(JSON.parse(line));
      }
    }
  }).catch(() => {});
  await settle(200);
  await etcd('/v3/kv/put', { key: enc('/registry/gw/watched'), value: enc('watched write') });
  await settle(300);
  watchController.abort();
  await stream;
  check('the watch stream opens with a created message', streamed[0]?.result?.created === true, streamed[0]?.result);
  let watchEvent = streamed.flatMap((m) => m.result?.events || [])[0];
  check('the watch stream delivers the write', dec(watchEvent?.kv?.value) === 'watched write', watchEvent);
  check('watch events name their type', watchEvent?.type === 'PUT', watchEvent?.type);

  await gateway.close();
  await gatewayNode.stop();

  // ---- durability --------------------------------------------------------
  let dir = node.raft.wal.dir;
  let port = new URL(node.address).port;
  let survivor = text((await node.range('/registry/pods/default/a')).kvs[0]);
  let revisionBefore = node.store.revision;
  await node.stop();

  let restarted = new StoreNode({ id: 'kv', dir, address: `http://127.0.0.1:${port}`, peers: [], sync: false });
  await restarted.start();
  await restarted.waitForLeader();
  let recovered = await restarted.range('/registry/pods/default/a');
  check('data survives a restart', recovered.kvs.length === 1 && text(recovered.kvs[0]) === survivor, recovered.kvs[0] && text(recovered.kvs[0]));
  // A restart that restarted the revision counter would hand out numbers a
  // client had already seen, and every watch resume would be wrong.
  check('the revision does not go backwards after a restart',
    restarted.store.revision >= revisionBefore, [revisionBefore, restarted.store.revision]);
  let writeAfterRestart = await restarted.put('/registry/pods/default/a', 'after restart');
  check('the revision continues from where it stopped',
    writeAfterRestart.revision > revisionBefore, [revisionBefore, writeAfterRestart.revision]);
  await restarted.stop();

  // ---- raft --------------------------------------------------------------
  let addresses = [23821, 23822, 23823].map((p) => `http://127.0.0.1:${p}`);
  let peers = addresses.map((address, i) => ({ id: `n${i + 1}`, address }));
  let cluster = peers.map((peer) => new StoreNode({
    id: peer.id,
    dir: tempDir(peer.id),
    address: peer.address,
    peers,
    sync: false,
    heartbeatInterval: 60,
    electionTimeout: 250,
  }));
  await Promise.all(cluster.map((n) => n.start()));
  await Promise.all(cluster.map((n) => n.waitForLeader(8000)));

  let leaders = cluster.filter((n) => n.isLeader);
  check('a three node cluster elects exactly one leader', leaders.length === 1, cluster.map((n) => n.status().role));
  check('every node agrees who leads',
    new Set(cluster.map((n) => n.raft.leaderId)).size === 1, cluster.map((n) => n.raft.leaderId));
  check('every node agrees on the term',
    new Set(cluster.map((n) => n.raft.currentTerm)).size === 1, cluster.map((n) => n.raft.currentTerm));

  let leader = leaders[0];
  let followers = cluster.filter((n) => !n.isLeader);
  await leader.put('/registry/replicated/key', 'from the leader');
  await settle(400);
  let onFollower = await followers[0].range('/registry/replicated/key');
  check('a write on the leader reaches the followers',
    onFollower.kvs.length === 1 && text(onFollower.kvs[0]) === 'from the leader', onFollower.kvs[0] && text(onFollower.kvs[0]));

  // A follower doesn't get to invent an order. It forwards, and the write
  // still happens -- the client shouldn't have to know which node it reached.
  let forwarded = await followers[1].put('/registry/replicated/forwarded', 'from a follower');
  check('a write sent to a follower still lands', forwarded.revision > 0, forwarded.revision);
  await settle(400);
  let onLeader = await leader.range('/registry/replicated/forwarded');
  check('the forwarded write is on the leader too',
    onLeader.kvs.length === 1 && text(onLeader.kvs[0]) === 'from a follower', onLeader.kvs[0] && text(onLeader.kvs[0]));

  check('the replicas agree on the revision',
    new Set(cluster.map((n) => n.store.revision)).size === 1, cluster.map((n) => n.store.revision));

  // Kill the leader: the remaining two are still a majority, so they must
  // elect a new leader and keep accepting writes.
  await leader.stop();
  let elected = null;
  let deadline = Date.now() + 8000;
  while (Date.now() < deadline && !elected) {
    await settle(100);
    elected = followers.find((n) => n.isLeader);
  }
  check('the survivors elect a new leader', Boolean(elected), followers.map((n) => n.status().role));
  if (elected) {
    let afterFailover = await elected.put('/registry/replicated/after-failover', 'still writable');
    check('the cluster still accepts writes after a failover', afterFailover.revision > 0, afterFailover.revision);
    await settle(400);
    let other = followers.find((n) => n !== elected);
    let replicatedAfter = await other.range('/registry/replicated/after-failover');
    check('the post-failover write replicated', replicatedAfter.kvs.length === 1, replicatedAfter.kvs.length);
    // The write from before the failover has to still be there: a leader that
    // came up with a shorter log and overwrote it would have lost an
    // acknowledged write, which is the failure Raft exists to prevent.
    let older = await elected.range('/registry/replicated/key');
    check('writes from the old leader survive the failover', older.kvs.length === 1, older.kvs.length);
  }

  await Promise.all(cluster.map((n) => n.stop().catch(() => {})));
  for (const root of roots) {
    fs.rmSync(root, { recursive: true, force: true });
  }

  console.log('---FAILS---');
  fails.forEach((f) => console.log(f));
  console.log(`\n${fails.length} fails, ${passes} passes.`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.log(`the suite itself blew up: ${e.stack}`);
  process.exit(1);
});
