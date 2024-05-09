const {
  stopContainer,
  killContainer,
  removeContainer,
  getContainerIP,
  runImage,
} = require('../functions.js');

const nodeSpec = require('./templates/node.json');
const axios = require('axios');
const { spawn } = require('child_process');

(async () => {
  let nodeName = 'worker-node-1';
  await runImage('ubuntu', nodeName);
  let ip = JSON.parse((await getContainerIP(nodeName)).raw)[0]?.NetworkSettings.Networks.bridge.IPAddress;
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

  let server = spawn('npm', ['start']);

  server.stdout.on('data', (data) => console.log(`[${new Date()}] [server] ${data}`));

  server.stderr.on('data', (data) => console.log(`[${new Date()}] [server] ${data}`));

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

  await axios.post('http://localhost:8080/api/v1/nodes', nodeSpec);
  let test = spawn('kubetest2', ['noop', '--kubeconfig=./test-config', '--v', '10', '--test=ginkgo'])

  test.stdout.on('data', (data) => console.log(`[${new Date()}] [test] ${data}`));

  test.stderr.on('data', (data) => console.log(`[${new Date()}] [test] ${data}`));

  test.on('close', async (code) => {
    console.log(`[test] closed`);
    await axios.delete(`http://localhost:8080/api/v1/nodes/${ip}`);
    server.kill('SIGKILL');
  });
})();
