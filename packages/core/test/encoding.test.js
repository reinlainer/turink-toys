'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { detect, decode, isAsciiOnly } = require('../src/tasks/archive/encoding');

// An archive written on Windows stores names in the system code page with no
// flag saying which one. Recovering the original name means guessing, so these
// cases check that the guess lands on the encoding that actually produced the
// bytes rather than on one that merely decodes without error.

// Bytes as a Windows machine in each locale would have written the name.
const SAMPLES = [
  {
    label: 'Korean',
    encoding: 'euc-kr',
    bytes: Buffer.from([0xba, 0xb8, 0xb0, 0xed, 0xbc, 0xad, 0x2e, 0x74, 0x78, 0x74]),
    expected: '보고서.txt',
  },
  {
    label: 'Japanese',
    encoding: 'shift_jis',
    bytes: Buffer.from([0x83, 0x65, 0x83, 0x58, 0x83, 0x67, 0x2e, 0x74, 0x78, 0x74]),
    expected: 'テスト.txt',
  },
];

for (const sample of SAMPLES) {
  test(`${sample.label} bytes decode correctly under their own code page`, () => {
    assert.equal(decode(sample.bytes, sample.encoding), sample.expected);
  });

  test(`${sample.label} bytes rank their own code page among the candidates`, () => {
    const results = detect([sample.bytes]);
    assert.ok(results.length > 0, 'at least one candidate should survive scoring');
    const own = results.find((r) => r.encoding === sample.encoding);
    assert.ok(own, `${sample.encoding} should appear among the candidates`);
    assert.equal(
      own.confidence,
      results[0].confidence,
      'the originating code page should score no lower than the best candidate'
    );
  });
}

test('candidates come back ordered by confidence', () => {
  const results = detect([SAMPLES[0].bytes]);
  for (let i = 1; i < results.length; i += 1) {
    assert.ok(
      results[i - 1].confidence >= results[i].confidence,
      'the caller reads the first entry as the best guess'
    );
  }
});

test('every candidate carries a sample so a person can pick', () => {
  for (const result of detect([SAMPLES[0].bytes])) {
    assert.ok(Array.isArray(result.sample) && result.sample.length > 0);
    assert.ok(result.label, 'a code page number alone does not help anyone choose');
  }
});

test('a decoding that produces replacement characters is discarded', () => {
  // A lone continuation byte is not valid UTF-8.
  const results = detect([Buffer.from([0xff, 0xfe, 0x2e, 0x74, 0x78, 0x74])]);
  assert.ok(
    !results.some((r) => r.encoding === 'utf-8'),
    'UTF-8 cannot represent these bytes and should not be offered'
  );
});

test('ASCII names need no guessing', () => {
  assert.equal(isAsciiOnly(Buffer.from('plain.txt')), true);
  assert.equal(isAsciiOnly(SAMPLES[0].bytes), false);
});
