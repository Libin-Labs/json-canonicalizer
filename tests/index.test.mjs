import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonicalize, canonicalizeUtf8 } from '../dist/esm/index.js';

test('sorted recursively', () => {
  assert.equal(
    canonicalize({ z: 1, a: { b: 2, a: 1 }, arr: [3, 2] }),
    '{"a":{"a":1,"b":2},"arr":[3,2],"z":1}',
  );
});
test('ECMAScript numbers', () => {
  assert.equal(
    canonicalize([-0, 1e30, 1e-7, 1e-6, 333333333.33333329]),
    '[0,1e+30,1e-7,0.000001,333333333.3333333]',
  );
});
test('UTF16 order not codepoint', () => {
  assert.equal(canonicalize({ '\ue000': 1, '😀': 2 }), '{"😀":2,"":1}');
  assert.equal(canonicalize({ 10: 1, 2: 2 }), '{"10":1,"2":2}');
});
test('string escaping and unicode', () => {
  assert.equal(canonicalize('\b\t\n\f\r"\\'), JSON.stringify('\b\t\n\f\r"\\'));
  assert.throws(() => canonicalize('\ud800'), TypeError);
  assert.throws(() => canonicalize({ ['\udfff']: 1 }), TypeError);
  assert.notEqual(canonicalize('é'), canonicalize('e\u0301'));
});
test('reject invalid JSON', () => {
  for (const v of [NaN, Infinity, undefined, new Date(), [, ,]])
    assert.throws(() => canonicalize(v), TypeError);
  const c = {};
  c.c = c;
  assert.throws(() => canonicalize(c), TypeError);
});
test('limits and owned UTF8', () => {
  assert.equal(canonicalize(0, { maxLength: 1, maxNodes: 1, maxDepth: 0 }), '0');
  assert.throws(() => canonicalize(0, { maxLength: 0 }), RangeError);
  assert.throws(() => canonicalize({ a: 0 }, { maxNodes: 1 }), RangeError);
  const a = canonicalizeUtf8('é'),
    b = canonicalizeUtf8('é');
  assert.deepEqual(a, new TextEncoder().encode('"é"'));
  a[0] = 0;
  assert.notEqual(b[0], 0);
});
test('RFC8785 serialization sample', () => {
  const input = {
    numbers: [333333333.33333329, 1e30, 4.5, 2e-3, 0.000000000000000000000000001],
    string: '€$\u000f\nA\'B"\\\\"/',
    literals: [null, true, false],
  };
  assert.equal(
    canonicalize(input),
    '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":' +
      JSON.stringify(input.string) +
      '}',
  );
});
test('safe proto keys and exact UTF16 output limit', () => {
  const value = JSON.parse('{"__proto__":{"polluted":true},"constructor":1}');
  const expected = '{"__proto__":{"polluted":true},"constructor":1}';
  assert.equal(canonicalize(value, { maxLength: expected.length }), expected);
  assert.throws(() => canonicalize(value, { maxLength: expected.length - 1 }), RangeError);
  assert.equal({}.polluted, undefined);
});
test('array holes, descriptors and toJSON reject without side effects', () => {
  for (const value of [new Array(1), Object.assign([1], { x: 1 }), { x: undefined }])
    assert.throws(() => canonicalize(value), TypeError);
  let called = false;
  const getter = Object.defineProperty({}, 'x', {
    enumerable: true,
    get() {
      called = true;
      return 1;
    },
  });
  assert.throws(() => canonicalize(getter), TypeError);
  assert.throws(
    () =>
      canonicalize({
        toJSON() {
          called = true;
          return {};
        },
      }),
    TypeError,
  );
  assert.equal(called, false);
});
test('nonlexical insertion and astral key sorting are deterministic', () => {
  const keys = ['1', '01', '10', '2', '😀', '\ufffd', '\r', '€', 'ö'];
  const expected =
    '{' +
    [...keys]
      .sort()
      .map((key) => JSON.stringify(key) + ':0')
      .join(',') +
    '}';
  for (let shift = 0; shift < keys.length; shift++) {
    const object = Object.fromEntries(
      [...keys.slice(shift), ...keys.slice(0, shift)].map((key) => [key, 0]),
    );
    assert.equal(canonicalize(object), expected);
  }
});
