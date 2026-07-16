const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  restoreProfileFiles,
  saveProfileFiles,
} = require('../src/editor/transaction');

function temporaryFiles() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-lab-transaction-'));
  return {
    directory,
    configPath: path.join(directory, 'profile.yaml'),
    outputPath: path.join(directory, 'assets', 'profile.svg'),
  };
}

test('双文件保存与单级恢复保持原始字节', () => {
  const files = temporaryFiles();
  fs.writeFileSync(files.configPath, Buffer.from('旧配置\n'));
  fs.mkdirSync(path.dirname(files.outputPath), { recursive: true });
  fs.writeFileSync(files.outputPath, Buffer.from('旧 SVG'));

  try {
    const snapshot = saveProfileFiles({
      ...files,
      configContent: '新配置\n',
      outputContent: '新 SVG',
    });
    assert.equal(fs.readFileSync(files.configPath, 'utf8'), '新配置\n');
    assert.equal(fs.readFileSync(files.outputPath, 'utf8'), '新 SVG');

    restoreProfileFiles({ ...files, snapshot });
    assert.equal(fs.readFileSync(files.configPath, 'utf8'), '旧配置\n');
    assert.equal(fs.readFileSync(files.outputPath, 'utf8'), '旧 SVG');
  } finally {
    fs.rmSync(files.directory, { recursive: true, force: true });
  }
});

test('事务可以恢复原本不存在的 SVG 输出', () => {
  const files = temporaryFiles();
  fs.writeFileSync(files.configPath, '旧配置\n', 'utf8');

  try {
    const snapshot = saveProfileFiles({
      ...files,
      configContent: '新配置\n',
      outputContent: '新 SVG',
    });
    assert.equal(fs.existsSync(files.outputPath), true);

    restoreProfileFiles({ ...files, snapshot });
    assert.equal(fs.readFileSync(files.configPath, 'utf8'), '旧配置\n');
    assert.equal(fs.existsSync(files.outputPath), false);
  } finally {
    fs.rmSync(files.directory, { recursive: true, force: true });
  }
});

test('第二个文件替换失败时自动恢复两个文件且不留临时文件', () => {
  const files = temporaryFiles();
  fs.writeFileSync(files.configPath, '旧配置\n', 'utf8');
  fs.mkdirSync(path.dirname(files.outputPath), { recursive: true });
  fs.writeFileSync(files.outputPath, '旧 SVG', 'utf8');

  try {
    assert.throws(() => saveProfileFiles({
      ...files,
      configContent: '新配置\n',
      outputContent: '新 SVG',
      beforeApply({ index }) {
        if (index === 1) {
          throw new Error('模拟第二步失败');
        }
      },
    }), /模拟第二步失败/);

    assert.equal(fs.readFileSync(files.configPath, 'utf8'), '旧配置\n');
    assert.equal(fs.readFileSync(files.outputPath, 'utf8'), '旧 SVG');
    const leftovers = fs.readdirSync(files.directory, { recursive: true })
      .filter((name) => /\.(tmp|bak)$/.test(name));
    assert.deepEqual(leftovers, []);
  } finally {
    fs.rmSync(files.directory, { recursive: true, force: true });
  }
});
