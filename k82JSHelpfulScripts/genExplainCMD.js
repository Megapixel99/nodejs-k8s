const fs = require('fs');
const { spawn } = require('child_process');

let yaml = fs.readFileSync('./resources.txt').toString();

(async () => {
  let arr = yaml.split('\n');
  arr.pop()
  for (let r of arr) {
    await new Promise(async (resolve, reject) => {
      console.log('kubectl', ...['explain', r, '--recursive', '>', `./yaml/${r}.yaml`]);
      resolve();
    });
  }
})();
