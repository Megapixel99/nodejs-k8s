// Runs every suite and prints one table.
//
// There was no way to ask "is this repo working?" in a single command --
// `npm test` runs the external conformance harness, and everything else was
// eight scripts you had to remember. Eight scripts you have to remember are
// seven scripts that don't get run.
//
// Each suite is a separate process on purpose: they hold server connections
// and background timers, and one suite's leftovers shouldn't decide another
// one's result. The exit code is what CI reads; the table is for people.
const { spawn } = require('child_process');
const path = require('path');

const base = process.env.K8S_SIM_BASE || 'http://localhost:8080';

const SUITES = [
  { name: 'store', file: 'store.js', needs: [] },
  { name: 'proto', file: 'proto-roundtrip.js', needs: ['server'] },
  { name: 'smoke', file: 'boot-clean.js', needs: ['server'] },
  { name: 'wire', file: 'wire-matrix.js', needs: ['server'] },
  { name: 'rv', file: 'resource-version.js', needs: ['server'] },
  { name: 'sched', file: 'scheduling.js', needs: ['server'] },
  { name: 'pods', file: 'pod-features.js', needs: ['server', 'docker'] },
  { name: 'workload', file: 'workload.js', needs: ['server', 'docker'] },
  { name: 'services', file: 'services.js', needs: ['server', 'docker'] },
];

// Every suite ends with a line like "0 fails, 83 passes." or, for the ones
// that count resources instead, "0 fails, 0 warns, out of 41 resources
// tested." Reading the number back beats trusting the exit code alone: a suite
// that crashed after printing nothing should not look like a suite that
// passed.
function summarise(output) {
  let line = output.trim().split('\n').reverse().find((l) => /\d+ fails?/.test(l));
  if (!line) {
    return { fails: null, summary: 'no summary line' };
  }
  let fails = Number(line.match(/(\d+) fails?/)?.[1]);
  return { fails, summary: line.trim() };
}

function run(suite) {
  return new Promise((resolve) => {
    let started = Date.now();
    let child = spawn(process.execPath, [path.join(__dirname, suite.file)], {
      cwd: path.join(__dirname, '..'),
      env: process.env,
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('close', (code) => {
      let { fails, summary } = summarise(output);
      resolve({
        ...suite,
        code,
        fails,
        summary,
        seconds: Math.round((Date.now() - started) / 100) / 10,
        output,
      });
    });
  });
}

(async () => {
  let only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  let suites = only.length ? SUITES.filter((s) => only.includes(s.name)) : SUITES;
  if (!suites.length) {
    console.log(`no such suite. known: ${SUITES.map((s) => s.name).join(', ')}`);
    process.exit(1);
  }

  let serverUp = await fetch(`${base}/api`).then(() => true).catch(() => false);
  if (!serverUp && suites.some((s) => s.needs.includes('server'))) {
    // Say it once, up front, rather than letting six suites each discover it.
    console.log(`nothing listening on ${base}.`);
    console.log('start the server first (npm start), or run just the suites that don\'t need it:');
    console.log(`  npm run test:all -- ${SUITES.filter((s) => !s.needs.length).map((s) => s.name).join(' ')}\n`);
    suites = suites.filter((s) => !s.needs.includes('server'));
    if (!suites.length) {
      process.exit(1);
    }
  }

  let results = [];
  for (const suite of suites) {
    process.stdout.write(`${suite.name.padEnd(10)} `);
    let result = await run(suite);
    results.push(result);
    let verdict = result.fails === 0 && result.code === 0 ? 'ok' : 'FAIL';
    process.stdout.write(`${verdict.padEnd(5)} ${result.summary} (${result.seconds}s)\n`);
  }

  let broken = results.filter((r) => r.code !== 0 || r.fails !== 0);
  if (broken.length) {
    for (const result of broken) {
      console.log(`\n--- ${result.name} (exit ${result.code}) ---`);
      // The failing lines, not the whole transcript: every suite prints its
      // failures after a ---FAILS--- marker.
      let detail = result.output.split('---FAILS---')[1] || result.output;
      console.log(detail.trim().split('\n').slice(0, 25).join('\n'));
    }
  }

  let total = results.reduce((sum, r) => sum + (r.fails || 0), 0);
  console.log(`\n${results.length - broken.length}/${results.length} suites clean, ${total} failing assertions.`);
  process.exit(broken.length ? 1 : 0);
})();
