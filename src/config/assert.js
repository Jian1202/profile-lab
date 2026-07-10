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

function string(value, path) {
  if (typeof value !== 'string' || !value.trim()) {
    fail(path, 'must be a non-empty string.');
  }
}

function boolean(value, path) {
  if (typeof value !== 'boolean') {
    fail(path, 'must be a boolean.');
  }
}

function number(value, path, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  if (!Number.isFinite(value) || value < min || value > max) {
    fail(path, `must be a number between ${min} and ${max}.`);
  }
}

function list(value, path) {
  if (!Array.isArray(value) || !value.length) {
    fail(path, 'must be a non-empty array.');
  }
}

function accent(value, path) {
  if (!accentTokens.has(value)) {
    fail(path, `must use a theme accent: ${[...accentTokens].join(', ')}.`);
  }
}

module.exports = { accent, boolean, fail, keys, list, number, object, string };
