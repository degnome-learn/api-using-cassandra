const Test = require('tape');
const DBClient = require('../lib/DbClient');
const config = require('./config');

Test('DBClient', assert => {
  const database = new DBClient();
  database.connect(config.db, (err, db) => {
    assert.ok(err === null, 'Database should connect without an error');
    assert.end();
    if (db) {
      db.close(() => process.exit(0));
    }
  });
});
