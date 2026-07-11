const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { SaxesParser } = require('saxes');
const { loadConfig } = require('../src/config/load-config');
const { layoutMissionItems, resolveMissionItems } = require('../src/blocks/mission');
const { shouldUseSkillColumns } = require('../src/blocks/skills');
const { layoutTagLines } = require('../src/blocks/projects');
const { validateProfileConfig } = require('../src/config/schema');
const { registry } = require('../src/registry');
const { renderProfile } = require('../src/renderer/generate-profile');
const theme = require('../src/themes/light-blue');
const { estimateTextWidth } = require('../src/text');

const fixtureDirectory = path.join(__dirname, 'fixtures');
const configPath = path.join(fixtureDirectory, 'jian1202-regression.yaml');
const baselinePath = path.join(fixtureDirectory, 'jian1202-regression-v0.1.0.svg');
const sectionIds = ['header', 'mission', 'timeline', 'radar', 'skills', 'projects', 'footer'];

function splitProfileSvg(svg) {
  const normalized = svg.replaceAll('\r\n', '\n');
  const starts = sectionIds.map((id) => {
    const index = normalized.indexOf(`  <g id="${id}"`);
    assert.notEqual(index, -1, `缺少区块 ${id}`);
    return { id, index };
  });
  const rootEnd = normalized.lastIndexOf('\n</svg>');
  const sections = {};

  starts.forEach(({ id, index }, position) => {
    const end = starts[position + 1]?.index ?? rootEnd;
    sections[id] = normalized.slice(index, end);
  });

  return {
    prefix: normalized.slice(0, starts[0].index),
    sections,
    suffix: normalized.slice(rootEnd),
  };
}

function parseSvg(svg) {
  const parser = new SaxesParser({ xmlns: true });
  let error;
  parser.onerror = (value) => { error = value; };
  parser.write(svg).close();
  if (error) throw error;
}

test('真实个人主页回归基线来源和哈希固定', () => {
  const config = loadConfig(configPath);
  const baseline = fs.readFileSync(baselinePath);
  const normalized = Buffer.from(baseline.toString('utf8').replaceAll('\r\n', '\n'));

  assert.equal(config.sections.length, 7);
  assert.equal(normalized.length, 17673);
  assert.equal(
    crypto.createHash('sha256').update(normalized).digest('hex'),
    'cfe812c419d49e9657a7712f10ce9395af5be34b7e56ece565870f9429514350',
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

test('Skills 根据实际垂直空间决定单列或双列', () => {
  const options = { startY: 126, gap: 28, height: 260, bottomPadding: 18 };

  assert.equal(shouldUseSkillColumns(4, options), false);
  assert.equal(shouldUseSkillColumns(5, options), false);
  assert.equal(shouldUseSkillColumns(6, options), true);
  assert.equal(shouldUseSkillColumns(5, { ...options, height: 220 }), true);
});

test('Projects 标签按完整 token 换行且不产生行首分隔符', () => {
  const options = {
    maxWidth: 184,
    maxLines: 2,
    fontSize: 10,
    family: 'Consolas, monospace',
    separator: ' · ',
  };
  const short = layoutTagLines(['Transformer', 'Education'], options);
  assert.deepEqual(short, [{ text: 'Transformer · Education', truncated: false }]);

  const wrapped = layoutTagLines(['Transformer', 'Education', 'Visualization'], options);
  assert.deepEqual(wrapped, [
    { text: 'Transformer · Education', truncated: false },
    { text: 'Visualization', truncated: false },
  ]);
  assert.doesNotMatch(wrapped[1].text, /^·/u);

  const long = layoutTagLines(['X'.repeat(80)], options);
  assert.equal(long[0].truncated, true);
  assert.match(long[0].text, /…$/u);
});

test('真实主页候选仅改变允许的目标区块', () => {
  const config = loadConfig(configPath);
  const baseline = fs.readFileSync(baselinePath, 'utf8');
  const candidate = renderProfile(config).svg;
  const oldParts = splitProfileSvg(baseline);
  const newParts = splitProfileSvg(candidate);
  const changed = sectionIds.filter((id) => oldParts.sections[id] !== newParts.sections[id]);

  parseSvg(candidate);
  assert.equal(candidate, renderProfile(config).svg);
  assert.equal(newParts.prefix, oldParts.prefix);
  assert.equal(newParts.suffix, oldParts.suffix);
  assert.deepEqual(changed, ['mission', 'projects']);
  for (const id of ['header', 'timeline', 'radar', 'footer']) {
    assert.equal(newParts.sections[id], oldParts.sections[id], id);
  }
  assert.equal(newParts.sections.skills, oldParts.sections.skills);
  assert.doesNotMatch(candidate, /NaN|undefined|Infinity/);
});

test('真实 Mission 完整显示文本且流式坐标不重叠或越界', () => {
  const config = loadConfig(configPath);
  const mission = config.sections.find((section) => section.id === 'mission').data.tracks[0];
  const items = resolveMissionItems(mission.items, 60, theme.fonts.mono);

  assert.deepEqual(items.map((item) => item.text), ['Transformer', 'LLM', 'Agent']);
  assert.equal(items.some((item) => item.truncated), false);
  for (const [index, item] of items.entries()) {
    const textEnd = item.x + 16 + estimateTextWidth(item.text, { fontSize: 13, family: theme.fonts.mono });
    assert.ok(item.x >= 86 && textEnd <= 392, item.text);
    if (index > 0 && items[index - 1].row === item.row) {
      const previous = items[index - 1];
      const previousEnd = previous.x + 16 + estimateTextWidth(previous.text, { fontSize: 13, family: theme.fonts.mono });
      assert.ok(previousEnd < item.x, `${previous.text} / ${item.text}`);
    }
  }
});

test('真实 Skills 五项保持单列并位于安全底部范围内', () => {
  const candidate = renderProfile(loadConfig(configPath)).svg;
  const skills = splitProfileSvg(candidate).sections.skills;
  const expected = [
    ['Machine Learning', 126],
    ['Deep Learning', 154],
    ['Transformer', 182],
    ['Agent', 210],
    ['……', 238],
  ];

  for (const [label, y] of expected) {
    assert.match(skills, new RegExp(`<text x="120" y="${y}"[^>]*>${label}</text>`));
  }
  assert.doesNotMatch(skills, /<line x1="270"/);
});

test('真实 Projects 长标签完整分为两行', () => {
  const candidate = renderProfile(loadConfig(configPath)).svg;
  const projects = splitProfileSvg(candidate).sections.projects;

  assert.match(projects, /<text x="328" y="188"[^>]*>Transformer · Education<\/text>/);
  assert.match(projects, /<text x="328" y="202"[^>]*>Visualization<\/text>/);
  assert.doesNotMatch(projects, />· Visualization<\/text>/);
  assert.doesNotMatch(projects, /Visual…/u);
});

test('Projects 两行描述只为标签保留一行并安全截断', () => {
  const config = loadConfig(configPath);
  const project = config.sections.find((section) => section.id === 'projects').data.entries[1];
  project.description = '这是一个需要稳定显示为两行的项目描述，用于验证标签不会覆盖描述内容';
  validateProfileConfig(config, registry);
  const projects = splitProfileSvg(renderProfile(config).svg).sections.projects;
  const tags = projects.match(/<text x="328" y="194"[^>]*>(.*?)<\/text>/g) || [];

  assert.equal(tags.length, 1);
  assert.match(tags[0], /…<\/text>/u);
  assert.doesNotMatch(projects, /<text x="328" y="202"/);
});
