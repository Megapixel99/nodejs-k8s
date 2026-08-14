// Does this repo actually load on a case-sensitive filesystem?
//
// macOS and Windows are case-insensitive, so `require('./csiDriver.js')`
// happily loads a file named csidriver.js and nothing looks wrong. On Linux --
// which is every CI runner and every container this would ever run in -- the
// same line throws MODULE_NOT_FOUND at startup, and the server doesn't come up
// at all. It is the one class of bug a developer on a Mac cannot hit locally
// and cannot miss in production, which makes it worth a test rather than a
// convention.
//
// Needs nothing: no server, no database, no network.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', '.store', 'volumes', 'coverage']);

let fails = [];
let checked = 0;

function sourceFiles(dir) {
  let found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.startsWith('_')) {
      continue;
    }
    let full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...sourceFiles(full));
    } else if (entry.name.endsWith('.js')) {
      found.push(full);
    }
  }
  return found;
}

// Resolve the way Node does, minus the case-insensitive filesystem doing it
// for us: a relative require is either the file itself, the file plus an
// extension, or a directory's index.
function resolveExactly(from, request) {
  let target = path.resolve(path.dirname(from), request);
  let candidates = [target, `${target}.js`, `${target}.json`, path.join(target, 'index.js')];
  for (const candidate of candidates) {
    let dir = path.dirname(candidate);
    let base = path.basename(candidate);
    if (!fs.existsSync(dir)) {
      continue;
    }
    let entries = fs.readdirSync(dir);
    if (entries.includes(base)) {
      return { ok: true };
    }
    // Present under a different casing: this is the failure worth reporting,
    // because it works here and only here.
    let mismatch = entries.find((e) => e.toLowerCase() === base.toLowerCase());
    if (mismatch) {
      return { ok: false, wanted: base, actual: mismatch, dir };
    }
  }
  return { ok: false, missing: true };
}

for (const file of sourceFiles(root)) {
  let source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/require\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g)) {
    // Templates that build a require from a variable can't be checked.
    if (match[1].includes('${')) {
      continue;
    }
    checked++;
    let result = resolveExactly(file, match[1]);
    if (result.ok || result.missing) {
      continue;
    }
    fails.push(
      `${path.relative(root, file)} requires '${match[1]}' but the file is '${result.actual}' `
      + `-- loads on macOS, throws MODULE_NOT_FOUND on Linux`,
    );
  }
}

console.log('---FAILS---');
fails.forEach((f) => console.log(f));
console.log(`\n${fails.length} fails, ${checked - fails.length} passes.`);
process.exit(fails.length ? 1 : 0);
