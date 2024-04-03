const axios = require('axios');
const express = require('express');
const readline = require("readline");
const dns = require('dns');
const https = require('https');
const http = require('http');
const { pipeline } = require("stream/promises");

let pods = [];
let cur = 0;
let ports = {};
let listeners = [];
let running = true;

let instance;

// TODO: Look into https://iximiuz.com/en/posts/multiple-containers-same-port-reverse-proxy/

if (process.env.DNS_SERVER?.trim() !== '') {
  let dnsServers = [
    process.env.DNS_SERVER?.trim(),
    '8.8.8.8', // Google
    '1.1.1.1', // Cloudflare
  ];

  const resolver = new dns.Resolver();
  resolver.setServers(dnsServers);

  const staticLookup = () => async (hostname, _ = null, cb) => {
    const ips = await dns.resolve(hostname);

    if (ips.length === 0) {
      throw new Error(`Unable to resolve ${hostname}`);
    }

    cb(null, ips[0], 4);
  };

  instance = axios.create({
    httpsAgent: new https.Agent({
      lookup: staticLookup,
    }),
    httpAgent: new http.Agent({
      lookup: staticLookup,
    }),
  });
} else {
  instance = axios;
}

const handler = (port) => {
  return async (req, res) => {
    try {
      let url = `http://${pods[cur]}:${port}${req.originalUrl}`
      console.log(`Forwarding to: ${url}`);
      req.params = {};
      const { data } = await instance[req.method.toLowerCase()](url, req, { responseType: 'stream' });
      await pipeline(data, res);
    } catch (e) {
      if (e.response) {
        return res.status(e.response.status).send(e.response.data);
      }
      console.log(e);
      res.sendStatus(503);
    }
    cur = (cur + 1) % pods.length;
  };;
}

function removePort(port) {
  let p = port.split(':');
  let l = listeners.findIndex((e) => port === e.address().port);
  if (p.length === 2 && l !== -1) {
    console.log(`Closing port: ${port}`);
    ports[p[1]] = undefined;
    l[p[1]].close();
    listeners.splice(l, 1);
  }
}

function addPort(port) {
  let p = port.split(':');
  let l = listeners.findIndex((e) => port === e.address().port);
  if (p.length === 2 && l === -1) {
    ports[p[1]] = p[0];
    const app = express();
    app.all('*', handler(Number(p[1])));
    console.log(`Opening server on: ${p[0]} and forwarding to ${p[1]}`);
    listeners.push(app.listen(Number(p[0])));
  }
}

function removePod(podIP) {
  let p = pods.findIndex((e) => e === podIP);
  if (p) {
    console.log(`Removing pod: ${podIP}`);
    pods.splice(p, 1);
  }
}

function addPod(podIP) {
  if (!pods.includes(podIP)) {
    console.log(`Adding pod: ${podIP}`);
    pods.push(podIP);
  }
}

let portIndex = process.argv.findIndex((e) => e === '-ports');
let podIndex = process.argv.findIndex((e) => e === '-pods');
if (portIndex !== -1 && podIndex !== -1) {
  if (process.argv.findIndex((e) => e === '-pods') < process.argv.findIndex((e) => e === '-ports')) {
    process.argv.slice(portIndex + 1).forEach(addPort);
    process.argv.slice(podIndex + 1, portIndex).forEach(addPod);
  } else {
    process.argv.slice(portIndex + 1, podIndex).forEach(addPort);
    process.argv.slice(podIndex + 1).forEach(addPod);
  }
} else if (process.env.PORTS && process.env.PODS) {
  process.env.PORTS.split(' ').forEach(addPort);
  process.env.PODS.split(' ').forEach(addPod);
}

const cli = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "\n",
});

cli.prompt();

cli.on("line", (line) => {
  let cmd = line.split(' ');
  if (cmd[0] === 'port') {
    if (cmd[1] === 'add') {
      addPort(cmd[2]);
    } else if (cmd[1] === 'remove') {
      removePort(cmd[2]);
    } else if (cmd[1] === 'list') {
      console.log(ports);
    }
  } else if (cmd[0] === 'pod') {
    if (cmd[1] === 'add') {
      addPod(cmd[2]);
    } else if (cmd[1] === 'remove') {
      removePod(cmd[2]);
    } else if (cmd[1] === 'list') {
      console.log(pods);
    }
  } else if (cmd[0] === 'kill') {
    process.exit(0);
  }

  cli.prompt();
});
