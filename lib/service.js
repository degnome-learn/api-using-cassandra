'use strict';

const Emitter = require('events').EventEmitter;
const util = require('util');
const bunyan = require('bunyan');
const bformat = require('bunyan-format');

let formatted = bformat({ outputMode: 'short', color: true });
let log = bunyan.createLogger({
  name: 'Service',
  level: process.env.LOG_LEVEL || 'info',
  stream: formatted,
  serializers: bunyan.stdSerializers
});