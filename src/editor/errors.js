class EditorError extends Error {
  constructor(code, message, { status = 400, path } = {}) {
    super(message);
    this.name = 'EditorError';
    this.code = code;
    this.status = status;
    if (path) {
      this.path = path;
    }
  }
}

function extractValidationPath(message) {
  const prefix = 'Invalid profile config: ';
  if (typeof message !== 'string' || !message.startsWith(prefix)) {
    return undefined;
  }

  const detail = message.slice(prefix.length);
  const match = detail.match(
    /^(page(?:\.[\w-]+|\[\d+\])*|theme(?:\.[\w-]+|\[\d+\])*|sections(?:\[\d+\])?(?:\s+"[^"]+")?(?:\.[\w-]+|\[\d+\])*)\s+/,
  );
  if (!match) {
    return undefined;
  }

  return match[1].replace(/(sections\[\d+\])\s+"[^"]+"/, '$1');
}

function invalidConfigError(error) {
  return new EditorError('INVALID_CONFIG', error.message, {
    status: 400,
    path: extractValidationPath(error.message),
  });
}

function toPublicError(error) {
  if (error instanceof EditorError) {
    return error;
  }

  return new EditorError('INTERNAL_ERROR', '编辑器处理请求时发生错误。', { status: 500 });
}

module.exports = {
  EditorError,
  extractValidationPath,
  invalidConfigError,
  toPublicError,
};
