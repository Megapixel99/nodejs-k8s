require('dotenv').config();
const { Schema, model, connect } = require('mongoose');

connect(process.env.DB_URL);

const dns = Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'A',
      'NS',
      'MD',
      'MF',
      'CNAME',
      'SOA',
      'MB',
      'MG',
      'MR',
      'NULL',
      'WKS',
      'PTR',
      'HINFO',
      'MINFO',
      'MX',
      'TXT',
      'AAAA',
      'SRV',
      'EDNS',
      'SPF',
      'AXFR',
      'MAILB',
      'MAILA',
      'ANY',
      'CAA',
    ],
    required: true
  },
  class: {
    type: String,
    enum: [
      'IN',
      'CS',
      'CH',
      'HS',
      'ANY',
    ],
    required: true
  },
  ttl: {
    type: Number,
    required: true
  },
  address: {
    type: String,
    required: true
  },
});

module.exports = {
  DNS: model('DNS', dns),
};
