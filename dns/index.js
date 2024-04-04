const dns = require('dns2');
const path = require('path');
const fs = require('fs');
const { DNS } = require('./db.js');

let cache = [];

const { Packet } = dns;

const server = dns.createServer({
  udp : true,
  tcp : true,
  // doh : {
  //   ssl  : true,
  //   cert : fs.readFileSync(path.join(__dirname, 'server.crt')),
  //   key  : fs.readFileSync(path.join(__dirname, 'secret.key')),
  // },
});

server.on('request', (request, send, client) => {
  const response = Packet.createResponseFromRequest(request);
  const [ question ] = request.questions;
  const { name } = question;
  let record = cache.find((e) => e.record.name === name)?.record;
  new Promise(function(resolve, reject) {
    if (!record) {
      return DNS.findOne({ name })
      .then((res) => {
        record = res;
        resolve({ cached: false });
      });
    }
    resolve({ cached: true });
  })
  .then((data) => {
    if (record) {
      response.answers.push({
        ...record,
        type: Packet.TYPE[record.type],
        class: Packet.CLASS[record.class],
      });
      send(response);
      if (!data.cached) {
        cache.push({
          time: Date.now(),
          record
        });
      }
    }
    cache.filter((e) => e.time <= (Date.now() - 3600000)); // one hour
  })
});

(async() => {
  const closed = new Promise(resolve => process.on('SIGINT', resolve));
  await server.listen({
    // doh : 8443,
    udp : 5333,
    tcp : 5334,
  });
  console.log('Listening.');
  console.log(server.addresses());
  await closed;
  process.stdout.write('\n');
  await server.close();
  console.log('Closed.');
  process.exit(0);
})();
