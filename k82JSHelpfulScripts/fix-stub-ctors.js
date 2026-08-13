// Wrap the generic constructor-copy so it handles Mongoose docs (which have
// enumerable $__, _doc, $isNew, etc. that were leaking into our toJSON).
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'objects');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));

let count = 0;
for (const f of files) {
  const full = path.join(dir, f);
  let src = fs.readFileSync(full, 'utf8');
  let orig = src;
  src = src.replace(
    /for \(const key of Object\.keys\(config \|\| \{\}\)\) \{\s*\n\s*if \(key === 'apiVersion' \|\| key === 'kind' \|\| key === 'metadata'\) continue;\s*\n\s*this\[key\] = config\[key\];\s*\n\s*\}/g,
    `let _src = (config && typeof config.toObject === 'function') ? config.toObject() : (config || {});
    for (const key of Object.keys(_src)) {
      if (key === 'apiVersion' || key === 'kind' || key === 'metadata') continue;
      if (key === '_id' || key === '__v') continue;
      this[key] = _src[key];
    }`
  );
  if (src !== orig) {
    fs.writeFileSync(full, src);
    count++;
  }
}
console.log(`updated ${count} files`);
