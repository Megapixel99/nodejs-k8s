const {
  stopContainer,
  killContainer,
  removeContainer,
  getContainerIP,
  runImage,
  randomBytes
} = require('../functions.js');

const { rmSync } = require('fs');
const nodeSpec = require('./templates/node.json');
const { DateTime } = require('luxon');
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  let nodeName = `worker-node-${randomBytes(2).toString('hex')}`;

  rmSync(path.resolve(`${__dirname}/../volumes`), { recursive: true, force: true })

  await new Promise((resolve, reject) => {
    spawn('kubectl', ['config', 'use-context', '/localhost:8080/admin'])
    .on('close', resolve);
  });

  await new Promise((resolve, reject) => {
    spawn('docker', ['kill', nodeName])
    .on('close', resolve);
  });

  await new Promise((resolve, reject) => {
    spawn('docker', ['rm', nodeName])
    .on('close', resolve);
  });

  await runImage('ubuntu', nodeName);
  let ip = (await getContainerIP(nodeName));
  nodeSpec.metadata.name = ip;
  nodeSpec.metadata.labels.name = nodeName;
  nodeSpec.status.addresses = [{
    "type": "ExternalIP",
    "address": ip,
  }, {
    "type": "InternalIP",
    "address": ip,
  }, {
    "type": "Hostname",
    "address": ip,
  }];

  await new Promise((resolve, reject) => {
    let s = spawn('lsof', ['-ti:8080'])

    s.stdout.on('data', (pid) => {
      process.kill(pid);
      let count = 0;
      setInterval(() => {
        try {
          process.kill(pid, 0);
        } catch (e) {
          resolve();
        }
        if (count >= 100) {
          reject(new Error("Timeout process kill"))
        }
      }, 100);
    });

    s.on('close', resolve);
  });

  let server = spawn('npm', ['start']);

  server.stdout.on('data', (data) => console.log(`[${DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")}] [server] ${data}`));

  server.stderr.on('data', (data) => console.log(`[${DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")}] [server] ${data}`));

  server.on('exit', async (code) => {
    console.log(`[server] closed`);
    await killContainer(nodeName);
    await removeContainer(nodeName);
    process.exit(0);
  });

  await new Promise((resolve, reject) => {
    let i = setInterval(() => {
      axios.get('http://localhost:8080/ping')
      .then(() => {
        clearInterval(i);
        resolve();
      })
      .catch(() => { });
    }, 10000);
  });

  try {
    await axios.delete(`http://localhost:8080/all`)
  } catch (e) { }
  await axios.post('http://localhost:8080/api/v1/nodes', nodeSpec);
  let test = spawn('kubetest2', ['noop', '--kubeconfig=./test-config', '--v', '10', '--test=ginkgo', '--', '--focus-regex=Variable Expansion allow almost all printable ASCII characters as environment variable names' ])

  test.stdout.on('data', (data) => console.log(`[${DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")}] [test] ${data}`));

  test.stderr.on('data', (data) => console.log(`[${DateTime.now().toUTC().toISO().replace(/\.\d{0,3}/, "")}] [test] ${data}`));

  test.on('close', async (code) => {
    console.log(`[test] closed`);
    server.kill('SIGKILL');
  });
})();
