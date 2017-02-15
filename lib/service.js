const Emitter = require('events').EventEmitter;
const util = require('util');
const bunyan = require('bunyan');
const bformat = require('bunyan-format');
const DbClient = require('./dbClient');
const Model = require('./models');
const dbSeed = require('./seed.json');

const formatted = bformat({ outputMode: 'short', color: true });
const log = bunyan.createLogger({
  name: 'Service',
  level: process.env.LOG_LEVEL || 'info',
  stream: formatted,
  serializers: bunyan.stdSerializers
});


const Service = function (config) {
  Emitter.call(this);
  let self = this;
  let continueWith = null;

  const db = new DbClient(config);
  let Table, closedb = null;


  // Create a Bad Result
  let sendError = (error, message) => {
    const result = Model.Response({message: message});
    log.error(error, 'Service.sendError');

    if (continueWith) { continueWith(null, result); }
  };

  // Create an Okay Result
  let sendData = (data) => {
      const result = Model.Response({success: true, message: 'Success', data: data});
      log.debug(result, 'Service.sendData() received');

      if (continueWith) { continueWith(null, result); }
  };

    // CREATE
  let createItem = function (args) {
      let message = 'DB Create Failure';
      let dto = Model.Item(args);
      if (dto.errors() !== null) return self.emit('send-error', dto.errors(), message);

      let row = new Table(dto);
      row.saveAsync()
      .then(() => self.emit('send-data'))
      .catch(err => self.emit('send-error', err, message));
  };

  let seed = (eventHandler, args) => {
    const message = 'DB Seed Failure';
    Table.findAsync({})
    .then((result) => {
      if (result.length > 0) return self.emit(eventHandler, args);
      log.debug('Service.openConnection()', 'Data Seeding Required');

      let count = 0;
      function raiseIfCompleted () {
        count++;
        if (count === dbSeed.length) return self.emit(eventHandler, args);
      }

      for (const o in dbSeed) {
        let model = new Table(Model.Item(o));
        log.trace('Service.seedData()', model.id);
        model.saveAsync()
        .then(raiseIfCompleted)
        .catch(err => self.emit('send-error', err, message));
      }
    }).catch(err => self.emit('send-error', err, message));
  };


  let openConnection = (eventHandler, args) => {
    const message = 'DB Connection Failure';
    log.debug('Service Connection Initiated');

    db.connect((err, db) => {
      if (err || db.instance.Item === undefined) return self.emit('send-error', err, message);
      closedb = db.close;
      Table = db.instance.Item;
      seed(eventHandler, args);
    });
  };

  /////////////////////////////////////////

  self.create = (input, done) => {
    log.debug({input: input}, 'Service.create()');
    continueWith = done;
    openConnection('create-item', input);
  };

  self.close = () => {
    log.debug('DB Connection Close', 'Service.close()');
    if (closedb) { closedb(); }
  };


  // Event Wireup
  self.on('send-data', sendData);
  self.on('send-error', sendError);
  self.on('create-item', createItem);

  return self;
};

util.inherits(Service, Emitter);
module.exports = Service;
