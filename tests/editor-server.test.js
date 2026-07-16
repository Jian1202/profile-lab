const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const YAML = require('yaml');
const { EditorSession } = require('../src/editor/api');
const { createEditorServer, startEditor } = require('../src/editor/server');

const root = path.resolve(__dirname, '..');
const exampleConfig = path.join(root, 'examples', 'minimal', 'profile.yaml');

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-lab-editor-server-'));
  const configPath = path.join(directory, 'profile.yaml');
  const outputPath = path.join(directory, 'missing-assets', 'profile.svg');
  const distPath = path.join(directory, 'dist');
  fs.copyFileSync(exampleConfig, configPath);
  fs.mkdirSync(distPath, { recursive: true });
  fs.writeFileSync(path.join(distPath, 'index.html'), '<!doctype html><title>Editor</title>', 'utf8');
  return { configPath, directory, distPath, outputPath };
}

test('Editor 启动时拒绝不存在或无效的配置', () => {
  const files = fixture();
  const invalidPath = path.join(files.directory, 'invalid.yaml');
  fs.writeFileSync(invalidPath, 'page: [', 'utf8');

  try {
    assert.throws(() => createEditorServer({
      configPath: path.join(files.directory, 'missing.yaml'),
      outputPath: files.outputPath,
      distPath: files.distPath,
    }), /配置文件不存在/);
    assert.throws(() => createEditorServer({
      configPath: invalidPath,
      outputPath: files.outputPath,
      distPath: files.distPath,
    }), /无法解析配置文件/);
  } finally {
    fs.rmSync(files.directory, { recursive: true, force: true });
  }
});

test('EditorSession 首次保存可以创建缺失的输出目录', () => {
  const files = fixture();
  try {
    const session = new EditorSession({
      configPath: files.configPath,
      outputPath: files.outputPath,
    });
    const config = YAML.parse(fs.readFileSync(files.configPath, 'utf8'));
    config.page.title = 'First Save';
    const result = session.save(config);

    assert.equal(result.config.page.title, 'First Save');
    assert.equal(fs.existsSync(files.outputPath), true);
    assert.match(fs.readFileSync(files.outputPath, 'utf8'), /<svg/);
  } finally {
    fs.rmSync(files.directory, { recursive: true, force: true });
  }
});

test('startEditor 只绑定 127.0.0.1', async () => {
  const files = fixture();
  let server;
  try {
    server = await startEditor({ ...files, port: 0 });
    assert.equal(server.address().address, '127.0.0.1');
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    fs.rmSync(files.directory, { recursive: true, force: true });
  }
});

test('startEditor 在端口占用时返回明确错误', async () => {
  const files = fixture();
  const blocker = http.createServer();
  await new Promise((resolve) => blocker.listen(0, '127.0.0.1', resolve));

  try {
    await assert.rejects(
      startEditor({ ...files, port: blocker.address().port }),
      /端口 \d+ 已被占用/,
    );
  } finally {
    await new Promise((resolve) => blocker.close(resolve));
    fs.rmSync(files.directory, { recursive: true, force: true });
  }
});
