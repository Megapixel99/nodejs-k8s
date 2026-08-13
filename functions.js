const { dockerCommand } = require('docker-cli-js');
const { randomBytes } = require("crypto");
const { spawn } = require("child_process");
const portfinder = require('portfinder');
const path = require('path');
const { isText, isBinary } = require('istextorbinary');
const { addSlashes } = require('slashes');

const VOLUMES_ROOT = path.resolve(__dirname, 'volumes');

// spawn-based docker runner that sidesteps shell interpretation entirely.
// Required because conformance tests set env var names with $, `, !, (, ), etc.
function dockerSpawn(args) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let p = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    p.stdout.on('data', (d) => { stdout += d.toString(); });
    p.stderr.on('data', (d) => { stderr += d.toString(); });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve({ raw: stdout, stderr, exitCode: 0 });
      else reject(Object.assign(new Error(`docker ${args.join(' ')} exited ${code}: ${stderr}`), { stdout, stderr, exitCode: code }));
    });
  });
}

const addSlashesToString = (str) => addSlashes(str).replaceAll('`', '\\`');

// Count the entries of a field that is a Map in the schema but a plain object
// once it has been through toJSON. `Object.keys` on a mongoose Map counts the
// document internals instead of the entries, and `.length` on either is
// undefined — both render as a wrong number in a Table cell without erroring.
let countEntries = (value) => {
  if (!value) {
    return 0;
  }
  if (value instanceof Map) {
    return value.size;
  }
  return Object.keys(value).length;
};

let duration = (timeDiff, loop = true) => {
  let y = 365 * 24 * 60 * 60 * 1000;
  let d = 24 * 60 * 60 * 10000;
  let h = 60 * 60 * 1000;
  let m = 60 * 1000;
  let s = 1000;
  if (timeDiff >= y) {
    let val = Math.floor(timeDiff / y);
    return `${val}y${duration(timeDiff - (y * val))}`;
  }
  if (timeDiff >= d) {
    let val = Math.floor(timeDiff / d);
    return `${val}d${duration(timeDiff - (d * val))}`;
  }
  if (timeDiff >= h) {
    let val = Math.floor(timeDiff / h);
    return `${val}h${duration(timeDiff - (h * val))}`;
  }
  if (timeDiff >= m) {
    let val = Math.floor(timeDiff / m);
    return `${val}m${duration(timeDiff - (m * val))}`;
  }
  if (timeDiff >= s) {
    return `${Math.floor(timeDiff / s)}s`;
  }
  return '0s';
};

let imageExists = (imageName, options) => dockerCommand(`inspect --type=image ${imageName.includes(':') ? imageName.split(':')[0] : imageName}`, { echo: false, ...options })
  .then((res) => !(res.length === 0 || (imageName.includes(':') && !res.object.find((e) => e.DockerVersion !== imageName.split(':')[1]))));
let buildImage = (imageName, dockerfile = 'Dockerfile', options) => {
  return dockerCommand(`build -t ${imageName} -f ${dockerfile} .`, { ...options })
};
let pullImage = (imageName) => dockerCommand(`pull ${imageName}`, { echo: false });
let dockerExec = (containerName, command) => dockerCommand(`exec -t ${containerName} ${command}`, { echo: false });
let runImage = async (imageName, containerName, options) => {
  let flags = ['run'];
  if (Array.isArray(options?.ports)) {
    for (const p of options.ports) flags.push('-p', String(p));
  }
  if (Array.isArray(options?.expose)) {
    for (const p of options.expose) flags.push('--expose', String(p));
  }
  if (Array.isArray(options?.env)) {
    for (const e of options.env) {
      flags.push('-e', `${e.name}=${e.value == null ? '' : e.value}`);
    }
  }
  if (Array.isArray(options?.volumeMounts)) {
    for (const v of options.volumeMounts) {
      let hostPath = path.join(VOLUMES_ROOT, v.sourceDir, v.file);
      let containerPath = `${v.mountPath.replace(/\/$/, '')}/${v.file}`;
      flags.push('-v', `${hostPath}:${containerPath}`);
    }
  }
  // Kubernetes container.command overrides ENTRYPOINT (docker --entrypoint
  // accepts only one token; remaining tokens become CMD args alongside k8s
  // container.args).
  let cmdAfterImage = [];
  let cmd = Array.isArray(options?.command) ? options.command : [];
  let cmdArgs = Array.isArray(options?.args) ? options.args : [];
  if (cmd.length > 0) {
    flags.push('--entrypoint', cmd[0]);
    cmdAfterImage = [...cmd.slice(1), ...cmdArgs];
  } else if (cmdArgs.length > 0) {
    cmdAfterImage = cmdArgs;
  }
  flags.push('--name', containerName, '-d', imageName, ...cmdAfterImage);
  console.log('docker', 'run', '--name', containerName, imageName, '...');
  return dockerSpawn(flags);
};

const isContainerRunning = (containerName) => dockerSpawn(['inspect', '-f', '{{.State.Running}}', containerName])
  .then((res) => ({ object: String(res.raw || '').trim() === 'true' }))
  .catch(() => ({ object: false }));

// True once the container has actually started executing, regardless of whether
// it's still running or has already exited. Needed because short-lived commands
// (e.g., `sh -c env`) finish before our status-polling loop wakes up.
const containerHasStarted = (containerName) => dockerSpawn(['inspect', '-f', '{{.State.Status}}', containerName])
  .then((res) => {
    let state = String(res.raw || '').trim();
    return state === 'running' || state === 'exited' || state === 'dead' || state === 'paused';
  })
  .catch(() => false);

const waitContainer = (containerName) => dockerSpawn(['wait', containerName])
  .then((res) => Number(String(res.raw || '').trim()) || 0)
  .catch(() => 1);

const execInContainer = (containerName, cmdOrArgs) => {
  let args = ['exec', containerName];
  if (Array.isArray(cmdOrArgs)) args.push(...cmdOrArgs);
  else args.push('sh', '-c', String(cmdOrArgs));
  return dockerSpawn(args)
    .then((res) => ({ code: 0, raw: res.raw }))
    .catch((err) => ({ code: err.exitCode || 1, raw: err.stderr || '' }));
};

const stopContainer = (containerName) => dockerSpawn(['stop', containerName]);

const getContainerLogs = (containerName) => dockerSpawn(['logs', containerName]);

const killContainer = (containerName) => dockerSpawn(['kill', containerName]);

const removeContainer = (containerName) => dockerSpawn(['rm', '-f', containerName]);

const getContainerIP = (containerName) => dockerSpawn(['inspect', containerName])
  .then((data) => JSON.parse(data.raw)[0]?.NetworkSettings.Networks.bridge.IPAddress);

const getAllContainersWithName = (containerName, imageName) => dockerCommand(`ps -q -f name=${containerName} -f ancestor=${imageName}`, { echo: false });

// TODO: figure out why `bin/bash` commands don't work
const addPodsToService = (containerName, pods) => {
  let ips = pods.map((e) => e.status.podIP);
  return dockerExec(containerName, `bin/bash -c '${ips.map((e) => `echo "pod add ${e}" > /proc/1/fd/0`).join(' ; ')}'`)
    .then(() => ips);
}

const addPortsToEndpoint = (containerName, ports) => {
  return dockerExec(containerName, `bin/bash -c '${ports.map((e) => `echo "port add ${e}" > /proc/1/fd/0`).join(' ; ')}'`)
    .then(() => ports);
}

const addPortToEndpoint = (containerName, port) => {
  return dockerExec(containerName, `bin/bash -c 'echo "port add ${port}" > /proc/1/fd/0'`);
}

const addPodToEndpoint = (containerName, podIP) => {
  return dockerExec(containerName, `bin/bash -c 'echo "pod add ${podIP}" > /proc/1/fd/0'`);
}

const removePortFromEndpoint = (containerName, port) => {
  return dockerExec(containerName, `bin/bash -c 'echo "port remove ${port}" > /proc/1/fd/0'`);
}

const removePodFromEndpoint = (containerName, podIP) => {
  return dockerExec(containerName, `bin/bash -c 'echo "pod remove ${podIP}" > /proc/1/fd/0'`);
}

module.exports = {
  isText,
  isContainerRunning,
  isBinary,
  imageExists,
  duration,
  countEntries,
  getAllContainersWithName,
  randomBytes,
  addPortsToEndpoint,
  addPortToEndpoint,
  addPodToEndpoint,
  removePortFromEndpoint,
  removePodFromEndpoint,
  getContainerIP,
  buildImage,
  pullImage,
  runImage,
  stopContainer,
  killContainer,
  removeContainer,
  getContainerLogs,
  waitContainer,
  execInContainer,
  containerHasStarted,
};
