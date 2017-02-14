const Emitter = require('events').EventEmitter;
const util = require('util');
const bunyan = require('bunyan');
const bformat = require('bunyan-format');
const Cassandra = require('irvui-express-cassandra');

const formatted = bformat({
  outputMode: 'short',
  color: true
});
const log = bunyan.createLogger({
  name: 'Database',
  level: process.env.LOG_LEVEL || 'info',
  stream: formatted,
  serializers: bunyan.stdSerializers
});


const Database = function() {
  Emitter.call(this);
  let self = this;
  let continueWith = null;
  let config;

  log.debug('Database Initialized', 'Database()');

  //////////////////////// INITIALIZATION DONE

  let getOptions = ({ host, port, keyspace } = {}) => {
    return {
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
  };

  let dbVersionCheck = () => {
    const VersionModel = {
      fields: {
          change: { type: 'int'},
          madeAt: { type: 'timestamp', default: { $db_function: 'toTimestamp(now())'} }
      },
      key: ['change']
    };

    const client = Cassandra.createClient(getOptions(config));
    const version = client.loadSchema('version', VersionModel, (err) => {
      if (err) return self.emit('send-error', err, 'dbVersionCheck()');

      version.find({$limit: 1}, (error, result) => {
        if (error) return self.emit('send-error', error, 'dbVersionCheck()');

        if (result.length > 1) {
          client.close();
          return self.emit('open-connection');
        } else {
          return self.emit('udt-load', client);
        }
      });

    });
  };

  let udtLoad = (client) => {
    const Table = client.instance.version;
    let i = 0, dbTypes = [];

    function loop () {
      if ( i < dbTypes.length ) {
        Table.execute_query(dbTypes[i], null, null, (err) => {
          if (err) return self.emit('send-error', err, 'udtLoad()');

          i++;
          loop();
        });
      } else {
        let version = new Table({ change: 1 });
        version.save(function(err) {
          if (err) return self.emit('send-error', err, 'udtLoad()');

          client.close();
          return self.emit('open-connection');
        });
      }
    }

    loop();
  };

  let openConnection = () => {
    Cassandra.setDirectory(__dirname + '/entities').bind(getOptions(config),
      (err) => {
        if (err) return self.emit('send-error', err, 'openConnection()');

        if (continueWith) {
          continueWith(null, Cassandra);
        }
      }
    );
  };


  // Send an Error
  let sendError = (err) => {
    log.error('Failure: ' + err);

    if (continueWith) continueWith(err, null);
  };

  /////////////////////////////////////////

  self.connect = (configuration, done) => {
    log.debug({ config: configuration }, 'Database.connect()');

    continueWith = done;
    config = configuration;

    return self.emit('db-version-check');
  };

  // Event Wireup
  self.on('db-version-check', dbVersionCheck);
  self.on('udt-load', udtLoad);
  self.on('open-connection', openConnection);
  self.on('send-error', sendError);

  return self;
};

util.inherits(Database, Emitter);
module.exports = Database;
