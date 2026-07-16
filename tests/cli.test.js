const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { run: runInProcess } = require('../bin/profile-lab');

const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'bin', 'profile-lab.js');
const config = path.join(root, 'examples', 'minimal', 'profile.yaml');
const invalidCapacity = path.join(root, 'tests', 'fixtures', 'invalid-capacity.yaml');

function run(args, cwd = root) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
}

test('CLI generate 可以使用指定输入和输出路径', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-lab-cli-'));
  const output = path.join(directory, 'nested', 'profile.svg');

  try {
    const result = run(['generate', '--config', config, '--output', output]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(fs.readFileSync(output, 'utf8'), /<svg/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI validate 不写入输出文件', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-lab-validate-'));

  try {
    const result = run(['validate', '--config', config], directory);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(fs.readdirSync(directory), []);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI 相对路径以当前工作目录为基准', () => {
  const output = path.join('tmp-test-output', 'profile.svg');
  const outputPath = path.join(root, output);

  try {
    const result = run([
      'generate',
      '--config', path.join('examples', 'minimal', 'profile.yaml'),
      '--output', output,
    ]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(outputPath), true);
  } finally {
    fs.rmSync(path.dirname(outputPath), { recursive: true, force: true });
  }
});

test('CLI 缺少参数时返回非零退出码和清晰错误', () => {
  const result = run(['generate', '--config', config]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--output/);
});

test('CLI help 展示可用命令', () => {
  const result = run(['--help']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /generate/);
  assert.match(result.stdout, /validate/);
  assert.match(result.stdout, /preview/);
  assert.match(result.stdout, /editor/);
});

test('CLI validate 对显示容量错误返回非零退出码和完整路径', () => {
  const result = run(['validate', '--config', invalidCapacity]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /sections\[0\] "mission"\.data\.tracks\[0\]\.items/);
  assert.match(result.stderr, /received 7/);
});

test('CLI editor 缺少 config 或 output 时返回清晰错误', () => {
  const missingConfig = run(['editor', '--output', 'profile.svg']);
  const missingOutput = run(['editor', '--config', config]);

  assert.notEqual(missingConfig.status, 0);
  assert.match(missingConfig.stderr, /--config/);
  assert.notEqual(missingOutput.status, 0);
  assert.match(missingOutput.stderr, /--output/);
});

test('CLI editor 拒绝非法端口', () => {
  const result = run([
    'editor',
    '--config', config,
    '--output', 'profile.svg',
    '--port', '70000',
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /1 到 65535/);
});

test('CLI editor 正确传递启动参数', async () => {
  let received;
  await runInProcess([
    'editor',
    '--config', 'example.yaml',
    '--output', 'profile.svg',
    '--port', '4188',
  ], {
    startEditor(options) {
      received = options;
      return Promise.resolve();
    },
  });

  assert.deepEqual(received, {
    configPath: 'example.yaml',
    outputPath: 'profile.svg',
    port: 4188,
  });
});
