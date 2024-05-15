const { dockerCommand } = require('docker-cli-js');
const { randomBytes } = require("crypto");
const portfinder = require('portfinder');
const { isText, isBinary } = require('istextorbinary');

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
  let cmd = `run `;

  if (Array.isArray(options?.ports) && options?.ports.length > 0) {
    cmd += (await Promise.all(options.ports.map(async (e) => {
      return `-p ${e} `;
    }))).join('');
  }
  if (Array.isArray(options?.expose) && options?.expose.length > 0) {
    cmd += (await Promise.all(options.expose.map(async (e) => {
      return `--expose ${e} `;
    }))).join('');
  }
  if (Array.isArray(options?.env) && options?.env.length > 0) {
    cmd += options.env.map((e) => `-e ${e.name}='${e.value}' `).join('');
  }
  cmd += `--name ${containerName} -itd ${imageName}`;
  return dockerCommand(cmd, { echo: false });
};

const isContainerRunning = (containerName) => dockerCommand(`inspect -f '{{.State.Running}}' "${containerName}"`, { echo: false });

const stopContainer = (containerName) => dockerCommand(`stop ${containerName}`, { echo: false });

const getContainerLogs = (containerName) => dockerCommand(`logs ${containerName}`, { echo: false });

const killContainer = (containerName) => dockerCommand(`kill ${containerName}`, { echo: false });

const removeContainer = (containerName) => dockerCommand(`rm ${containerName}`, { echo: false });

const getContainerIP = (containerName) => dockerCommand(`inspect ${containerName}`, { echo: false })

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
};
