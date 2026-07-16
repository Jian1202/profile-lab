const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const YAML = require('yaml');
const { generateProfile } = require('../src');
const { createEditorServer, MAX_BODY_BYTES } = require('../src/editor/server');

const root = path.resolve(__dirname, '..');
const exampleConfig = path.join(root, 'examples', 'minimal', 'profile.yaml');

function hash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function withServer(callback, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-lab-editor-api-'));
  const configPath = path.join(directory, 'profile.yaml');
  const outputPath = path.join(directory, 'assets', 'profile.svg');
  const distPath = path.join(directory, 'dist');
  fs.copyFileSync(exampleConfig, configPath);
  generateProfile({ configPath, outputPath });
  fs.mkdirSync(distPath, { recursive: true });
  fs.writeFileSync(distPath + path.sep + 'index.html', '<!doctype html><title>Editor fixture</title>', 'utf8');

  const server = createEditorServer({
    configPath,
    outputPath,
    distPath,
    logger: { error() {} },
    transactionHooks: options.transactionHooks,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await callback({ baseUrl, configPath, directory, outputPath });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function json(response) {
  return { response, body: await response.json() };
}

async function postConfig(baseUrl, endpoint, config, method = 'POST') {
  return fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
}

test('session、config 与静态页面不泄露绝对路径并设置安全响应头', async () => {
  await withServer(async ({ baseUrl, configPath }) => {
    const sessionResult = await json(await fetch(`${baseUrl}/api/editor/session`));
    const configResult = await json(await fetch(`${baseUrl}/api/editor/config`));
    const page = await fetch(`${baseUrl}/`);

    assert.equal(sessionResult.response.status, 200);
    assert.equal(sessionResult.body.ok, true);
    assert.equal(sessionResult.body.data.configFileName, 'profile.yaml');
    assert.equal(sessionResult.body.data.outputFileName, 'profile.svg');
    assert.equal(sessionResult.body.data.canRollback, false);
    assert.equal(JSON.stringify(sessionResult.body).includes(path.dirname(configPath)), false);
    assert.equal(configResult.body.data.configHash, hash(fs.readFileSync(configPath)));
    assert.equal(configResult.body.data.config.page.title, 'Developer Profile');
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
    assert.match(page.headers.get('content-security-policy'), /object-src 'none'/);
  });
});

test('Manifest 使用内容 SHA-256 ETag 并支持 304', async () => {
  await withServer(async ({ baseUrl }) => {
    const first = await fetch(`${baseUrl}/api/editor/manifest`);
    const payload = await first.json();
    const etag = first.headers.get('etag');
    const manifestJson = JSON.stringify(payload.data);
    const second = await fetch(`${baseUrl}/api/editor/manifest`, {
      headers: { 'If-None-Match': etag },
    });

    assert.equal(first.status, 200);
    assert.equal(etag, `"${hash(manifestJson)}"`);
    assert.equal(payload.data.contract.version, 1);
    assert.equal(second.status, 304);
    assert.equal(await second.text(), '');
  });
});

test('validate 和 render 使用现有 Validator 且渲染结果确定', async () => {
  await withServer(async ({ baseUrl, configPath }) => {
    const config = YAML.parse(fs.readFileSync(configPath, 'utf8'));
    const valid = await json(await postConfig(baseUrl, '/api/editor/validate', config));
    const first = await json(await postConfig(baseUrl, '/api/editor/render', config));
    const second = await json(await postConfig(baseUrl, '/api/editor/render', config));
    const invalidConfig = structuredClone(config);
    invalidConfig.page.title = '';
    const invalid = await json(await postConfig(baseUrl, '/api/editor/render', invalidConfig));

    assert.equal(valid.body.data.valid, true);
    assert.equal(first.body.data.svg, second.body.data.svg);
    assert.equal(first.body.data.svgHash, second.body.data.svgHash);
    assert.equal(first.body.data.svgHash, hash(first.body.data.svg));
    assert.equal(invalid.response.status, 400);
    assert.equal(invalid.body.error.code, 'INVALID_CONFIG');
    assert.equal(invalid.body.error.path, 'page.title');
  });
});

test('save 同时更新稳定 YAML 与 SVG，rollback 精确恢复原字节', async () => {
  await withServer(async ({ baseUrl, configPath, outputPath }) => {
    const originalConfig = fs.readFileSync(configPath);
    const originalSvg = fs.readFileSync(outputPath);
    const config = YAML.parse(originalConfig.toString('utf8'));
    config.page.title = 'Edited Profile';

    const renderResult = await json(await postConfig(baseUrl, '/api/editor/render', config));
    const saveResult = await json(await postConfig(baseUrl, '/api/editor/save', config, 'PUT'));
    const savedSource = fs.readFileSync(configPath, 'utf8');

    assert.equal(saveResult.response.status, 200);
    assert.equal(saveResult.body.data.config.page.title, 'Edited Profile');
    assert.equal(saveResult.body.data.configHash, hash(savedSource));
    assert.equal(saveResult.body.data.svgHash, renderResult.body.data.svgHash);
    assert.equal(fs.readFileSync(outputPath, 'utf8'), renderResult.body.data.svg);
    assert.equal(savedSource.endsWith('\n'), true);
    assert.doesNotThrow(() => YAML.parse(savedSource));

    const session = await json(await fetch(`${baseUrl}/api/editor/session`));
    assert.equal(session.body.data.canRollback, true);
    const rollback = await json(await fetch(`${baseUrl}/api/editor/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }));

    assert.equal(rollback.response.status, 200);
    assert.deepEqual(fs.readFileSync(configPath), originalConfig);
    assert.deepEqual(fs.readFileSync(outputPath), originalSvg);
    assert.equal(rollback.body.data.canRollback, false);
  });
});

test('非法 save 与事务中途失败均不会改变任一文件', async () => {
  await withServer(async ({ baseUrl, configPath, outputPath }) => {
    const originalConfig = fs.readFileSync(configPath);
    const originalSvg = fs.readFileSync(outputPath);
    const config = YAML.parse(originalConfig.toString('utf8'));
    config.page.title = '';
    const result = await postConfig(baseUrl, '/api/editor/save', config, 'PUT');

    assert.equal(result.status, 400);
    assert.deepEqual(fs.readFileSync(configPath), originalConfig);
    assert.deepEqual(fs.readFileSync(outputPath), originalSvg);
  });

  await withServer(async ({ baseUrl, configPath, outputPath }) => {
    const originalConfig = fs.readFileSync(configPath);
    const originalSvg = fs.readFileSync(outputPath);
    const config = YAML.parse(originalConfig.toString('utf8'));
    config.page.title = 'Will fail';
    const result = await postConfig(baseUrl, '/api/editor/save', config, 'PUT');

    assert.equal(result.status, 500);
    assert.deepEqual(fs.readFileSync(configPath), originalConfig);
    assert.deepEqual(fs.readFileSync(outputPath), originalSvg);
  }, {
    transactionHooks: {
      beforeSaveApply({ index }) {
        if (index === 1) {
          throw new Error('模拟输出替换失败');
        }
      },
    },
  });
});

test('无备份 rollback、未知路径和错误 method 返回结构化错误', async () => {
  await withServer(async ({ baseUrl }) => {
    const rollback = await json(await fetch(`${baseUrl}/api/editor/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }));
    const missing = await json(await fetch(`${baseUrl}/api/editor/unknown`));
    const method = await json(await fetch(`${baseUrl}/api/editor/render`));

    assert.equal(rollback.response.status, 409);
    assert.equal(rollback.body.error.code, 'NO_ROLLBACK');
    assert.equal(missing.response.status, 404);
    assert.equal(method.response.status, 405);
    assert.equal(method.response.headers.get('allow'), 'POST');
  });
});

test('API 拒绝非 JSON、超大请求和任何客户端路径参数', async () => {
  await withServer(async ({ baseUrl, directory, configPath }) => {
    const config = YAML.parse(fs.readFileSync(configPath, 'utf8'));
    const nonJson = await fetch(`${baseUrl}/api/editor/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: '{}',
    });
    const malformedJson = await fetch(`${baseUrl}/api/editor/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"config":',
    });
    const oversized = await fetch(`${baseUrl}/api/editor/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, padding: 'x'.repeat(MAX_BODY_BYTES) }),
    });
    const arbitraryPath = await fetch(`${baseUrl}/api/editor/save`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, path: path.join(directory, 'other.yaml') }),
    });
    const queryPath = await fetch(`${baseUrl}/api/editor/config?path=other.yaml`);
    const traversal = await fetch(`${baseUrl}/..%2f..%2fwindows%2fwin.ini`);

    assert.equal(nonJson.status, 415);
    assert.equal(malformedJson.status, 400);
    assert.equal((await malformedJson.json()).error.code, 'INVALID_JSON');
    assert.equal(oversized.status, 413);
    assert.equal(arbitraryPath.status, 400);
    assert.equal(queryPath.status, 400);
    assert.equal(traversal.status, 404);
    assert.equal(fs.existsSync(path.join(directory, 'other.yaml')), false);
  });
});
