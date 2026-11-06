# @lp-labs/json-canonicalizer

RFC 8785-compatible canonical serialization for finite plain JSON values.

## Install

```sh
npm install @lp-labs/json-canonicalizer
```

Node.js 18+; standalone browser-compatible ES2022 core with DOM codec types. Zero runtime or peer dependencies. ESM and CommonJS with separate declarations. No filesystem, network or environment side effects.

## Quickstart

```js
import { canonicalize, canonicalizeUtf8 } from '@lp-labs/json-canonicalizer';
console.log(canonicalize({ z: 1, a: [true, null, -0] }));
console.log(canonicalizeUtf8({ a: 'é' }).length);
```

CommonJS consumers use `const api = require('@lp-labs/json-canonicalizer')`. The same named API is available in both module formats. No default export.

## API, behavior, errors and limits

canonicalize emits RFC8785 JSON Canonicalization Scheme serialization for already-parsed finite plain JsonValue data: recursively UTF-16 code-unit-sorted property keys, ECMAScript JSON.stringify number/string serialization, no whitespace. Integer-looking keys are manually emitted in lexical order (not object insertion order). Negative zero serializes as 0. No Unicode normalization: lone surrogates in keys/values reject. canonicalizeUtf8 returns new UTF-8 bytes of the same serialization. Not a JSON parser, duplicate-key detector, cryptographic hash, signer, or arbitrary-JavaScript serializer; callers must reject duplicate members when parsing source text externally. JsonLimits maxDepth defaults 64 (root 0, maximum 256), maxNodes 100,000. CanonicalOptions.maxLength defaults 16,777,216 UTF-16 output units (UTF-8 may require more bytes). TypeError invalid/nonfinite JSON/surrogates; RangeError budgets. Dense arrays and plain/null-prototype objects only, no getters/toJSON/custom classes/symbol keys/cycles. Sorting cost sum O(k log k) for object key counts plus serialization; linear detached/output memory with bounded recursion.

All exports: `JsonValue`, `JsonLimits`, `CanonicalOptions`, `canonicalize`, `canonicalizeUtf8`.

## Full TypeScript declarations

```ts
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };
export interface JsonLimits {
  maxDepth?: number;
  maxNodes?: number;
}
export interface CanonicalOptions extends JsonLimits {
  maxLength?: number;
}
export declare function canonicalize(value: JsonValue, o?: CanonicalOptions): string;
export declare function canonicalizeUtf8(value: JsonValue, o?: CanonicalOptions): Uint8Array;
```

## Development

```sh
npm ci --offline
npm run typecheck
npm test
npm run format:check
```

TypeScript ^5.9.3 and Prettier ^3.6.2 are development-only. Build emits dist/esm and dist/cjs. Tests use Node's test runner; consumer.mts and consumer.cts exercise bare package imports including negative type assertions.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
