import { canonicalize, canonicalizeUtf8 } from '@lp-labs/json-canonicalizer';
const text: string = canonicalize({ b: 2, a: 1 });
const bytes: Uint8Array = canonicalizeUtf8(text);
void bytes;
// @ts-expect-error undefined is not JSON
canonicalize(undefined);
