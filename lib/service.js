const Emitter = require('events').EventEmitter;
const util = require('util');
const bunyan = require('bunyan');
const bformat = require('bunyan-format');
const DbClient = require('./dbClient');
const Model = require('./models');

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
    const result = new Model.Response({message: message});
    log.error(error, 'Service.sendError');

    if (continueWith) { continueWith(null, result); }
  };

  // Create an Okay Result
  let sendData = (data) => {
      const result = new Model.Response({success: true, message: 'Success', data: data});
      log.debug(result, 'Service.sendData() received');

      if (continueWith) { continueWith(null, result); }
  };

    // CREATE
  let createItem = function (params) {
      let message = 'DB Create Failure';

      let dto = new Model.Item(params);
      let errors = dto.errors();
      if (errors !== null) return self.emit('send-error', errors, message);

      let row = new Table(dto.toJson());
      row.save((err) => {
          if (err) return self.emit('send-error', err, message);
          else return self.emit('send-data', dto);
      });
  };


  let openConnection = (eventHandler, args) => {
    const errorMsg = 'DB Connection Failure';
    log.debug('Service Connection Initiated');

    db.connect((err, db) => {
      if (err || db.instance.Item === undefined) return self.emit('send-error', err, errorMsg);
      closedb = db.close;
      Table = db.instance.Item;

      Table.findAsync({})
      .then((result) => {
        if (result.length > 0) return self.emit(eventHandler, args);

        log.debug('Seeding the Default Data for Item Table');
        let data = require('./seed.json');
        let count = 0;

        for (var value of data) {
          let dto = new Model.Item(value);
          let model = new Table(dto);
          model.saveAsync()
          .then(() => {
            count++;
            if (count === data.length) return self.emit(eventHandler, args);
          }).catch(err => self.emit('send-error', err));
        }

      }).catch(err => self.emit('send-error', err));
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
