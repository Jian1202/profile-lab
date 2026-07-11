const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { loadConfig } = require('../src/config/load-config');
const { layoutMissionItems } = require('../src/blocks/mission');

const fixtureDirectory = path.join(__dirname, 'fixtures');
const configPath = path.join(fixtureDirectory, 'jian1202-regression.yaml');
const baselinePath = path.join(fixtureDirectory, 'jian1202-regression-v0.1.0.svg');

test('真实个人主页回归基线来源和哈希固定', () => {
  const config = loadConfig(configPath);
  const baseline = fs.readFileSync(baselinePath);

  assert.equal(config.sections.length, 7);
  assert.equal(baseline.length, 17912);
  assert.equal(
    crypto.createHash('sha256').update(baseline).digest('hex'),
    'b4ff9f2268496a5683862b91946dcbcfdd51ae8998b313806c9069c6395f79dc',
  );
});

test('Mission 流式布局优先保留完整文本并限制为两行', () => {
  const options = {
    startX: 86,
    startY: 154,
    availableWidth: 306,
    maxRows: 2,
    rowGap: 26,
    itemGap: 18,
    bulletToTextGap: 16,
    fontSize: 13,
    fontFamily: 'Consolas, monospace',
  };
  const items = layoutMissionItems(['Transformer', 'LLM', 'Agent', 'Frontend', 'Tooling', 'CV'], options);

  assert.equal(items.length, 6);
  assert.equal(items.some((item) => item.text === 'Transformer'), true);
  assert.equal(items.some((item) => item.truncated), false);
  assert.ok(Math.max(...items.map((item) => item.row)) <= 1);

  const long = layoutMissionItems(['X'.repeat(80)], options);
  assert.equal(long[0].truncated, true);
  assert.match(long[0].text, /…$/u);
});
