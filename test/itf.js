const { readFileSync } = require('fs');
const { Writable } = require('stream');
const { resolve } = require('path');

const itf = require('../');

function loadFile(file) {
  const filename = resolve(__dirname, file);
  return readFileSync(filename);
}

function generateITF(t, fn) {
  const chunks = [];

  const ostream = new Writable({
    write(chunk, encoding, next) {
      chunks.push(chunk);
      next();
    },
    final(next) {
      fn(null, Buffer.concat(chunks));
      next();
    }
  });

  itf(ostream, t);
}

/**
 * Compare buffers
 */
function compareITF(actual, expected) {
  actual.should.have.length(expected.length);
  // skip 4 byte timestamp at the start
  for(let i = 4; i < actual.length; i += 1) {
    actual.readUInt8(i).should.eql(expected.readUInt8(i), `at index ${i}`);
  }
}

describe('furkot Sygic ITF', function () {

  it('simple trip', function(done) {
    const t = require('./fixtures/simple-trip.json');
    const expected = loadFile('./fixtures/simple.itf');

    generateITF(t, (err, generated) => {
      // require('fs').writeFileSync('simple.itf', generated);
      compareITF(generated, expected);
      done(err);
    });
  });

  it('multi trip', function (done) {
    const t = require('./fixtures/multi-trip.json');
    const expected = loadFile('./fixtures/multi.itf');

    generateITF(t, (err, generated) => {
      // require('fs').writeFileSync('multi.itf', generated);
      compareITF(generated, expected);
      done(err);
    });
  });

});
