const Test = require('tape');
const Client = require('../lib/DbClient');
const config = require('./config');

Test('Database Client', assert => {
  const client = new Client(config);
  client.connect((err, db) => {
    assert.ok(err === null, 'Database should connect without an error');
    assert.end();
    if (db) { db.close(() => process.exit(0)); }
  });
});
