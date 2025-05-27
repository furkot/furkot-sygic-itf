import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Writable } from 'node:stream';
import test from 'node:test';

import itf from '../lib/itf.js';

function loadFile(file) {
  const filename = resolve(import.meta.dirname, file);
  return readFileSync(filename);
}

function loadJSON(file) {
  return JSON.parse(loadFile(file));
}

function generateITF(t, fn) {
  const chunks = [];

  const ostream = new Writable({
    write(chunk, _encoding, next) {
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
  assert.equal(actual.length, expected.length);
  // skip 4 byte timestamp at the start
  for (let i = 4; i < actual.length; i += 1) {
    assert.equal(actual.readUInt8(i), expected.readUInt8(i), `at index ${i}`);
  }
}

test('simple trip', (_, done) => {
  const data = loadJSON('./fixtures/simple-trip.json');
  const expected = loadFile('./fixtures/simple.itf');

  generateITF(data, (err, generated) => {
    // require('fs').writeFileSync('simple.itf', generated);
    compareITF(generated, expected);
    done(err);
  });
});

test('simple trip - missing name in one stop', (_, done) => {
  const data = loadJSON('./fixtures/simple-trip.json');
  const expected = loadFile('./fixtures/simple-no-name.itf');

  delete data.routes[0].points[1].name;
  generateITF(data, (err, generated) => {
    // require('fs').writeFileSync('simple-no-name.itf', generated);
    compareITF(generated, expected);
    done(err);
  });
});

test('multi trip', (_, done) => {
  const data = loadJSON('./fixtures/multi-trip.json');
  const expected = loadFile('./fixtures/multi.itf');

  generateITF(data, (err, generated) => {
    // require('fs').writeFileSync('multi.itf', generated);
    compareITF(generated, expected);
    done(err);
  });
});
