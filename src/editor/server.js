const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { EditorSession } = require('./api');
const { EditorError, toPublicError } = require('./errors');

const MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_DIST_PATH = path.resolve(__dirname, '..', '..', 'editor', 'dist');
const API_METHODS = new Map([
  ['/api/editor/session', 'GET'],
  ['/api/editor/manifest', 'GET'],
  ['/api/editor/config', 'GET'],
  ['/api/editor/validate', 'POST'],
  ['/api/editor/render', 'POST'],
  ['/api/editor/save', 'PUT'],
  ['/api/editor/rollback', 'POST'],
]);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
};

function securityHeaders() {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "base-uri 'none'",
      "connect-src 'self'",
      "font-src 'self'",
      "form-action 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' blob: data:",
      "object-src 'none'",
      "script-src 'self'",
      "style-src 'self'",
    ].join('; '),
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  };
}

function send(response, status, body, headers = {}) {
  const content = body === undefined || body === null ? null : Buffer.from(body);
  response.writeHead(status, {
    ...securityHeaders(),
    ...headers,
    ...(content ? { 'Content-Length': content.length } : {}),
  });
  response.end(content);
}

function sendJson(response, status, payload, headers = {}) {
  send(response, status, JSON.stringify(payload), {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
}

function sendData(response, data) {
  sendJson(response, 200, { ok: true, data });
}

function sendApiError(response, error, logger) {
  const publicError = toPublicError(error);
  if (publicError.status >= 500) {
    logger.error(error);
  }
  const detail = {
    code: publicError.code,
    message: publicError.message,
    ...(publicError.path ? { path: publicError.path } : {}),
  };
  sendJson(response, publicError.status, { ok: false, error: detail });
}

function readJsonBody(request) {
  const contentType = request.headers['content-type'] || '';
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new EditorError('UNSUPPORTED_MEDIA_TYPE', '请求必须使用 application/json。', { status: 415 });
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      if (!tooLarge) {
        chunks.push(chunk);
      }
    });
    request.on('error', reject);
    request.on('end', () => {
      if (tooLarge) {
        reject(new EditorError('PAYLOAD_TOO_LARGE', '请求体不能超过 1 MB。', { status: 413 }));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new EditorError('INVALID_JSON', '请求体不是合法 JSON。', { status: 400 }));
      }
    });
  });
}

function configFromBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new EditorError('INVALID_REQUEST', '请求体必须是对象。');
  }
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'config') {
    throw new EditorError('INVALID_REQUEST', '请求体只能包含 config。');
  }
  if (!body.config || typeof body.config !== 'object' || Array.isArray(body.config)) {
    throw new EditorError('INVALID_REQUEST', 'config 必须是对象。');
  }
  return body.config;
}

async function handleApi(request, response, url, session, logger) {
  const allowedMethod = API_METHODS.get(url.pathname);
  if (!allowedMethod) {
    sendJson(response, 404, {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'API 路径不存在。' },
    });
    return;
  }
  if (url.search) {
    throw new EditorError('INVALID_REQUEST', 'Editor API 不接受查询参数。');
  }
  if (request.method !== allowedMethod) {
    sendJson(response, 405, {
      ok: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: '请求方法不受支持。' },
    }, { Allow: allowedMethod });
    return;
  }

  if (url.pathname === '/api/editor/session') {
    sendData(response, session.getSession());
    return;
  }
  if (url.pathname === '/api/editor/manifest') {
    const manifest = session.getManifest();
    if (request.headers['if-none-match'] === manifest.etag) {
      send(response, 304, null, { ETag: manifest.etag });
      return;
    }
    sendJson(response, 200, { ok: true, data: manifest.manifest }, { ETag: manifest.etag });
    return;
  }
  if (url.pathname === '/api/editor/config') {
    sendData(response, session.getConfig());
    return;
  }

  const body = await readJsonBody(request);
  if (url.pathname === '/api/editor/rollback') {
    if (Object.keys(body).length) {
      throw new EditorError('INVALID_REQUEST', 'rollback 请求体必须是空对象。');
    }
    sendData(response, session.rollback());
    return;
  }

  const config = configFromBody(body);
  if (url.pathname === '/api/editor/validate') {
    sendData(response, session.validate(config));
    return;
  }
  if (url.pathname === '/api/editor/render') {
    sendData(response, session.render(config));
    return;
  }
  if (url.pathname === '/api/editor/save') {
    sendData(response, session.save(config));
  }
}

function staticPath(distPath, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) {
    return null;
  }
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const resolved = path.resolve(distPath, relative);
  const root = `${path.resolve(distPath)}${path.sep}`;
  return resolved.startsWith(root) ? resolved : null;
}

function serveStatic(request, response, url, distPath) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    send(response, 405, 'Method not allowed', {
      Allow: 'GET, HEAD',
      'Content-Type': 'text/plain; charset=utf-8',
    });
    return;
  }
  const filePath = staticPath(distPath, url.pathname);
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    send(response, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }
  const content = fs.readFileSync(filePath);
  const body = request.method === 'HEAD' ? null : content;
  send(response, 200, body, {
    'Cache-Control': 'no-cache',
    'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    ...(request.method === 'HEAD' ? { 'Content-Length': content.length } : {}),
  });
}

function requireEditorBuild(distPath) {
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new EditorError(
      'EDITOR_NOT_BUILT',
      '未找到编辑器构建产物，请先运行 npm run editor:build。',
      { status: 500 },
    );
  }
}

function createEditorServer({
  configPath,
  outputPath,
  distPath = DEFAULT_DIST_PATH,
  logger = console,
  transactionHooks,
}) {
  const resolvedDistPath = path.resolve(distPath);
  requireEditorBuild(resolvedDistPath);
  const session = new EditorSession({ configPath, outputPath, transactionHooks });

  return http.createServer(async (request, response) => {
    let url;
    try {
      url = new URL(request.url, 'http://127.0.0.1');
      if (url.pathname.startsWith('/api/')) {
        await handleApi(request, response, url, session, logger);
      } else {
        serveStatic(request, response, url, resolvedDistPath);
      }
    } catch (error) {
      if (!response.headersSent) {
        sendApiError(response, error, logger);
      } else {
        response.destroy();
      }
    }
  });
}

function startEditor(options) {
  const port = options.port ?? 4173;
  const server = createEditorServer(options);

  return new Promise((resolve, reject) => {
    const handleError = (error) => {
      if (error.code === 'EADDRINUSE') {
        reject(new EditorError('PORT_IN_USE', `端口 ${port} 已被占用。`, { status: 500 }));
        return;
      }
      reject(error);
    };
    server.once('error', handleError);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', handleError);
      console.log(`Profile Lab editor: http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

module.exports = {
  DEFAULT_DIST_PATH,
  MAX_BODY_BYTES,
  createEditorServer,
  startEditor,
};
