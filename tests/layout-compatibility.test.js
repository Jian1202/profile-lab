const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { loadConfig } = require('../src/config/load-config');

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
