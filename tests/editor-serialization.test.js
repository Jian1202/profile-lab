const assert = require('node:assert/strict');
const test = require('node:test');
const YAML = require('yaml');
const { loadConfig } = require('../src/config/load-config');
const { validateProfileConfig } = require('../src/config/schema');
const { serializeProfileConfig } = require('../src/editor/serialization');
const { registry } = require('../src/registry');

const configPath = require('node:path').resolve(__dirname, '..', 'examples', 'jian1202', 'profile.yaml');

test('YAML 序列化连续执行完全一致并保持 UTF-8 单换行', () => {
  const config = loadConfig(configPath);
  const first = serializeProfileConfig(config);
  const second = serializeProfileConfig(config);

  assert.equal(first, second);
  assert.equal(first.endsWith('\n'), true);
  assert.equal(first.endsWith('\n\n'), false);
  assert.equal(Buffer.from(first, 'utf8').toString('utf8'), first);
  assert.match(first, /渡的小窝/);
});

test('YAML 顶层、Section 和 data 字段顺序稳定', () => {
  const source = serializeProfileConfig(loadConfig(configPath));

  assert.ok(source.indexOf('page:') < source.indexOf('theme:'));
  assert.ok(source.indexOf('theme:') < source.indexOf('sections:'));
  assert.match(source, /- id: header\n\s+type: header\n\s+enabled: true\n\s+variant: default\n\s+data:/);
  assert.match(source, /- name: my-agent\n\s+description: 从零写 LLM Agent 的小实践\n\s+tags:\n(?:\s+- .+\n)+\s+color: blue/);
});

test('保存后的 YAML 可重新解析并通过现有 Validator', () => {
  const source = serializeProfileConfig(loadConfig(configPath));
  const parsed = YAML.parse(source);

  assert.doesNotThrow(() => validateProfileConfig(parsed, registry));
  assert.equal(JSON.stringify(parsed).includes('undefined'), false);
  assert.equal(JSON.stringify(parsed).includes('null'), false);
});
