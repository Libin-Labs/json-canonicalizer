export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export interface JsonLimits {
  maxDepth?: number;
  maxNodes?: number;
}
function cloneJson(value: JsonValue, o: JsonLimits = {}): JsonValue {
  const maxDepth = o.maxDepth ?? 64,
    maxNodes = o.maxNodes ?? 100000;
  if (
    !Number.isSafeInteger(maxDepth) ||
    maxDepth < 0 ||
    maxDepth > 256 ||
    !Number.isSafeInteger(maxNodes) ||
    maxNodes < 1
  )
    throw new RangeError('Invalid JSON limits');
  let nodes = 0;
  const path = new Set<object>();
  const visit = (v: JsonValue, depth: number): JsonValue => {
    if (depth > maxDepth || ++nodes > maxNodes) throw new RangeError('JSON budget exceeded');
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw new TypeError('Nonfinite JSON number');
      return v;
    }
    if (typeof v !== 'object') throw new TypeError('Not a JSON value');
    if (path.has(v)) throw new TypeError('Cyclic JSON');
    path.add(v);
    if (Object.getOwnPropertySymbols(v).length) throw new TypeError('Symbol keys are not JSON');
    let result: JsonValue;
    if (Array.isArray(v)) {
      const keys = Object.getOwnPropertyNames(v);
      if (keys.length !== v.length + 1) throw new TypeError('Sparse or decorated array');
      const out: JsonValue[] = [];
      for (let i = 0; i < v.length; i++) {
        const d = Object.getOwnPropertyDescriptor(v, String(i));
        if (!d || !d.enumerable || !('value' in d)) throw new TypeError('Sparse or accessor array');
        out.push(visit(d.value as JsonValue, depth + 1));
      }
      result = out;
    } else {
      if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null)
        throw new TypeError('Not a plain JSON object');
      const out: { [key: string]: JsonValue } = Object.create(null) as { [key: string]: JsonValue };
      for (const key of Object.getOwnPropertyNames(v)) {
        const d = Object.getOwnPropertyDescriptor(v, key)!;
        if (!d.enumerable || !('value' in d))
          throw new TypeError('Nonenumerable or accessor property');
        out[key] = visit(d.value as JsonValue, depth + 1);
      }
      result = out;
    }
    path.delete(v);
    return result;
  };
  return visit(value, 0);
}

export interface CanonicalOptions extends JsonLimits {
  maxLength?: number;
}
function unicode(text: string): void {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = text.charCodeAt(++i);
      if (!(d >= 0xdc00 && d <= 0xdfff)) throw new TypeError('Lone Unicode surrogate');
    } else if (c >= 0xdc00 && c <= 0xdfff) throw new TypeError('Lone Unicode surrogate');
  }
}
export function canonicalize(value: JsonValue, o: CanonicalOptions = {}): string {
  const max = o.maxLength ?? 16_777_216;
  if (!Number.isSafeInteger(max) || max < 0) throw new RangeError('Invalid maxLength');
  const copy = cloneJson(value, o),
    parts: string[] = [];
  let length = 0;
  const emit = (s: string): void => {
    length += s.length;
    if (length > max) throw new RangeError('Output limit exceeded');
    parts.push(s);
  };
  const visit = (v: JsonValue): void => {
    if (v === null || typeof v === 'number' || typeof v === 'boolean') {
      emit(JSON.stringify(v));
      return;
    }
    if (typeof v === 'string') {
      unicode(v);
      emit(JSON.stringify(v));
      return;
    }
    if (Array.isArray(v)) {
      emit('[');
      for (let i = 0; i < v.length; i++) {
        if (i) emit(',');
        visit(v[i]!);
      }
      emit(']');
      return;
    }
    emit('{');
    const keys = Object.keys(v).sort();
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      unicode(key);
      if (i) emit(',');
      emit(JSON.stringify(key));
      emit(':');
      visit(v[key]!);
    }
    emit('}');
  };
  visit(copy);
  return parts.join('');
}
export function canonicalizeUtf8(value: JsonValue, o: CanonicalOptions = {}): Uint8Array {
  return new TextEncoder().encode(canonicalize(value, o));
}
