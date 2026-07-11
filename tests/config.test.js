const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { loadConfig } = require('../src/config/load-config');
const { validateProfileConfig } = require('../src/config/schema');
const { registry, getBlock } = require('../src/registry');
const { renderProfile } = require('../src/renderer/generate-profile');
const layout = require('../src/layout');

const examplePath = path.resolve(__dirname, '..', 'examples', 'jian1202', 'profile.yaml');

function cloneConfig() {
  return structuredClone(loadConfig(examplePath));
}

test('合法配置能够加载并通过 registry 查找', () => {
  const config = cloneConfig();

  assert.equal(config.sections.length, 7);
  assert.equal(getBlock(config.sections[0]), registry.header);
  assert.equal(getBlock(config.sections[2]), registry.timeline);
});

test('未知 type、未知 variant 与重复 section id 会被拒绝', () => {
  const unknownType = cloneConfig();
  unknownType.sections[0].type = 'unknown';
  assert.throws(() => validateProfileConfig(unknownType, registry), /unknown/);

  const unknownVariant = cloneConfig();
  unknownVariant.sections[0].variant = 'compact';
  assert.throws(() => validateProfileConfig(unknownVariant, registry), /variant/);

  const duplicateId = cloneConfig();
  duplicateId.sections[1].id = duplicateId.sections[0].id;
  assert.throws(() => validateProfileConfig(duplicateId, registry), /duplicated/);
});

test('enabled false 会跳过区块并更新动态高度', () => {
  const config = cloneConfig();
  const base = renderProfile(config);
  config.sections.find((section) => section.id === 'timeline').enabled = false;
  validateProfileConfig(config, registry);
  const result = renderProfile(config);

  assert.equal(result.enabledSections.some((section) => section.id === 'timeline'), false);
  assert.equal(result.height, base.height - layout.blockHeights.timeline);
});

test('sections 数组顺序决定 SVG 顺序', () => {
  const config = cloneConfig();
  const timelineIndex = config.sections.findIndex((section) => section.id === 'timeline');
  const radarIndex = config.sections.findIndex((section) => section.id === 'radar');
  [config.sections[timelineIndex], config.sections[radarIndex]] = [config.sections[radarIndex], config.sections[timelineIndex]];
  validateProfileConfig(config, registry);
  const result = renderProfile(config);

  assert.ok(result.svg.indexOf('id="radar"') < result.svg.indexOf('id="timeline"'));
});

test('Timeline 增加条目时会增加所需高度', () => {
  const config = cloneConfig();
  const base = renderProfile(config);
  const timeline = config.sections.find((section) => section.id === 'timeline');
  timeline.data.entries.push({ year: 'Next', focus: 'Applied AI', color: 'green' });
  validateProfileConfig(config, registry);
  const result = renderProfile(config);

  assert.equal(result.height, base.height + 30);
  assert.match(result.svg, /Applied AI/);
});

test('显示容量限制会返回完整字段路径和实际数量', () => {
  const config = cloneConfig();
  const mission = config.sections.find((section) => section.id === 'mission');
  mission.data.tracks[0].items.push('One', 'Two', 'Three', 'Four');

  assert.throws(
    () => validateProfileConfig(config, registry),
    /sections\[1\] "mission"\.data\.tracks\[0\]\.items must contain between 1 and 6 items, received 7/,
  );
});

test('字符串长度按 Unicode code point 校验', () => {
  const config = cloneConfig();
  const header = config.sections.find((section) => section.id === 'header');
  header.data.title = '🚀'.repeat(37);

  assert.throws(
    () => validateProfileConfig(config, registry),
    /sections\[0\] "header"\.data\.title must contain between 1 and 36 characters, received 37/,
  );
});

test('Radar 拒绝非法数值和不完整语言占比', () => {
  const invalidValue = cloneConfig();
  invalidValue.sections.find((section) => section.id === 'radar').data.stats[0].value = Number.POSITIVE_INFINITY;
  assert.throws(() => validateProfileConfig(invalidValue, registry), /finite number/);

  const invalidTotal = cloneConfig();
  invalidTotal.sections.find((section) => section.id === 'radar').data.languages[0].percent = 60;
  assert.throws(
    () => validateProfileConfig(invalidTotal, registry),
    /sections\[3\] "radar"\.data\.languages percentages must sum to 100, received 93/,
  );
});
