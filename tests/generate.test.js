const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { generateProfile } = require('../src');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'examples', 'jian1202', 'profile.yaml');
const expectedPath = path.join(root, 'examples', 'jian1202', 'assets', 'profile.svg');

test('Jian1202 示例输出与迁移基准逐字节一致', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-lab-generate-'));
  const outputPath = path.join(directory, 'profile.svg');

  try {
    const result = generateProfile({ configPath, outputPath });
    assert.equal(result.width, 860);
    assert.equal(result.height, 1516);
    const actual = fs.readFileSync(outputPath);
    const expected = fs.readFileSync(expectedPath);
    assert.deepEqual(actual, expected);
    assert.equal(
      crypto.createHash('sha256').update(actual).digest('hex'),
      '05cd42f3b09ffdb42ae55c3da67951021165d1dd020aa239d6c8adafe97d2a72',
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('连续生成结果完全一致', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-lab-deterministic-'));
  const outputPath = path.join(directory, 'profile.svg');

  try {
    generateProfile({ configPath, outputPath });
    const first = fs.readFileSync(outputPath, 'utf8');
    generateProfile({ configPath, outputPath });
    assert.equal(fs.readFileSync(outputPath, 'utf8'), first);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('无效配置不会覆盖已有输出', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-lab-atomic-'));
  const invalidConfigPath = path.join(directory, 'invalid.yaml');
  const outputPath = path.join(directory, 'profile.svg');
  fs.writeFileSync(invalidConfigPath, 'page: [', 'utf8');
  fs.writeFileSync(outputPath, 'existing-svg', 'utf8');

  try {
    assert.throws(() => generateProfile({ configPath: invalidConfigPath, outputPath }), /无法解析配置文件/);
    assert.equal(fs.readFileSync(outputPath, 'utf8'), 'existing-svg');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
