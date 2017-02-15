const test = require('tape');

const config = require('./config');
const seed = require('../lib/seed.json');
const DbClient = require('../lib/DbClient');
const Service = require('../lib/service');

const client = new DbClient(config);
const service = new Service(config);


const before = test;
const after = test;
let Database, Table;


before('before', function (assert) {
  client.connect((err, db) => {
    const dropTable = 'truncate test.Item;';
    db.instance.Item.execute_query(dropTable, null, (err, result) => {
      Database = db;
      Table = db.instance.Item;
      assert.end();
    });
  });
});


test('creates an item and returns it', assert => {
  service.create(seed[0], (err, result) => {
    assert.ok(err === null, 'No Service Error');
    assert.ok(result.success, 'Should be success');
    assert.same('Success', result.message, 'Message should be success');
    assert.end();

  });
});


after('after', (assert) => {
  Database.close();
  assert.end();
  process.exit(0);
});


// function Before (done) {
//   const dropTable = 'truncate test.Item;';
//   const client = new DbClient(config);
//   client.connect((err, db) => {
//     db.instance.Item.execute_query(dropTable, null, (err, result) => {
//       done(db);
//     });
//   });
// }

// function After (db) {
//   db.close(() => process.exit(0));
// }

// Before(db => {
//   Test('Service', assert => {

//   });

//   After(db);
// });

// Test('Service', assert => {

// });

// Test('Service', TC => {
//   setup((db) => {

//     TC.test('Test 1', assert => {
//       assert.ok(true);
//       assert.end();
//       close(db);
//     });
//   });
// });
