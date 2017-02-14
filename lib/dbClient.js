const Emitter = require('events').EventEmitter;
const util = require('util');
const bunyan = require('bunyan');
const bformat = require('bunyan-format');
const Cassandra = require('express-cassandra');

const formatted = bformat({ outputMode: 'short', color: true });
const log = bunyan.createLogger({
  name: 'Database',
  level: process.env.LOG_LEVEL || 'info',
  stream: formatted,
  serializers: bunyan.stdSerializers
});

const Database = function({ db: { host, port, keyspace} } = {}) {
  const dbOptions = {
    clientOptions: {
      contactPoints: [host],
      protocolOptions: { port: port },
      keyspace: keyspace,
      queryOptions: { consistency: Cassandra.consistencies.one }
    },
    ormOptions: {
      defaultReplicationStrategy: {
        class: 'SimpleStrategy',
        replication_factor: 1
      },
      dropTableOnSchemaChange: false,
      createKeyspace: true
    }
  };
  const modelSchema = {
    fields: {
      change: { type: 'int'},
      madeAt: { type: 'timestamp', default: { $db_function: 'toTimestamp(now())'} }
    },
    key: ['change']
  };
  //////////////////////////////
  Emitter.call(this);
  let self = this;
  let continueWith = null;

  const checkSchema = () => {
    const db = Cassandra.createClient(dbOptions);
    db.connectAsync()
    .then(() => {

      // Load Version Schema
      db.loadSchemaAsync('version', modelSchema)
      .then(Table => {

        // Select * from version;
        Table.findAsync({ $limit: 1})
        .then(rows => {
          if (rows.length === 0) return self.emit('open-connection');

          // Save a new row into Database
          const row = new Table({ change: 1 });
          row.saveAsync()
          .then(() => self.emit('open-connection'))
          .catch(err => self.emit('send-error', err));
        }).catch(err => self.emit('send-error', err));
      }).catch(err => self.emit('send-error', err));
    }).catch(err => self.emit('send-error', err));
 };

  const openConnection = () => {
    Cassandra.setDirectory(__dirname + '/entities').bind(dbOptions, (err) => {
      if (err) return self.emit('send-error', err, 'openConnection()');
      if (continueWith) continueWith(null, Cassandra);
    });
  };

  const sendError = (err) => {
    log.error('Failure: ' + err);
    if (continueWith) continueWith(err, null);
  };

  /////////////////////////////////////////

  self.connect = (done) => {
    log.debug({ host: host, port: port, keyspace: keyspace }, 'Database.connect()');

    continueWith = done;
    return self.emit('check-schema');
  };

  // Event Wireup
  self.on('check-schema', checkSchema);
  self.on('open-connection', openConnection);
  self.on('send-error', sendError);
  log.debug('Database Initialized');

  return self;
};

util.inherits(Database, Emitter);
module.exports = Database;
