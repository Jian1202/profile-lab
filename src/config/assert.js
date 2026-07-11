const accentTokens = new Set(['blue', 'green', 'gold']);

function fail(path, message) {
  throw new Error(`Invalid profile config: ${path} ${message}`);
}

function object(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(path, 'must be an object.');
  }
}

function keys(value, path, expected) {
  object(value, path);
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();

  if (actual.length !== required.length || actual.some((key, index) => key !== required[index])) {
    fail(path, `must contain exactly: ${required.join(', ')}.`);
  }
}

function string(value, path, { minLength = 1, maxLength = Number.POSITIVE_INFINITY } = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    fail(path, 'must be a non-empty string.');
  }

  const length = Array.from(value).length;
  if (length < minLength || length > maxLength) {
    const range = Number.isFinite(maxLength)
      ? `between ${minLength} and ${maxLength}`
      : `at least ${minLength}`;
    fail(path, `must contain ${range} characters, received ${length}.`);
  }
}

function boolean(value, path) {
  if (typeof value !== 'boolean') {
    fail(path, 'must be a boolean.');
  }
}

function number(value, path, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  if (!Number.isFinite(value) || value < min || value > max) {
    const range = Number.isFinite(max) ? `between ${min} and ${max}` : `at least ${min}`;
    fail(path, `must be a finite number ${range}, received ${value}.`);
  }
}

function list(value, path, { minItems = 1, maxItems = Number.POSITIVE_INFINITY } = {}) {
  if (!Array.isArray(value)) {
    fail(path, 'must be an array.');
  }
  if (value.length < minItems || value.length > maxItems) {
    const range = Number.isFinite(maxItems)
      ? `between ${minItems} and ${maxItems}`
      : `at least ${minItems}`;
    fail(path, `must contain ${range} items, received ${value.length}.`);
  }
  if (!value.length) {
    fail(path, 'must be a non-empty array.');
  }
}

function accent(value, path) {
  if (!accentTokens.has(value)) {
    fail(path, `must use a theme accent: ${[...accentTokens].join(', ')}.`);
  }
}

module.exports = { accent, boolean, fail, keys, list, number, object, string };
