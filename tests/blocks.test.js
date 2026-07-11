const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { SaxesParser } = require('saxes');
const { loadConfig } = require('../src/config/load-config');
const { validateProfileConfig } = require('../src/config/schema');
const { registry } = require('../src/registry');
const { renderProfile } = require('../src/renderer/generate-profile');

const examplePath = path.resolve(__dirname, '..', 'examples', 'jian1202', 'profile.yaml');

function cloneConfig() {
  return structuredClone(loadConfig(examplePath));
}

function parseSvg(svg) {
  const parser = new SaxesParser({ xmlns: true });
  let error;
  parser.onerror = (value) => { error = value; };
  parser.write(svg).close();
  if (error) throw error;
}

test('七个区块的正常数据均可生成合法 SVG', () => {
  const result = renderProfile(cloneConfig());

  parseSvg(result.svg);
  for (const id of ['header', 'mission', 'timeline', 'radar', 'skills', 'projects', 'footer']) {
    assert.match(result.svg, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(result.svg, /NaN|undefined|Infinity/);
});

test('接近容量上限的中英文、Emoji 和 XML 内容仍可安全渲染', () => {
  const config = loadConfig(path.join(__dirname, 'fixtures', 'long-text.yaml'));
  const first = renderProfile(config);
  const second = renderProfile(config);

  parseSvg(first.svg);
  assert.equal(first.svg, second.svg);
  assert.match(first.svg, /…/u);
  assert.match(first.svg, /&amp;/);
  assert.match(first.svg, /&lt;/);
  assert.doesNotMatch(first.svg, /NaN|undefined|Infinity/);
  assert.ok(first.height >= 1516);
});

test('每种区块的超限内容都在校验阶段被拒绝', () => {
  const cases = [
    ['header', (data) => { data.title = 'H'.repeat(37); }, /header"\.data\.title.*received 37/],
    ['mission', (data) => { data.tracks[0].items.push('4', '5', '6', '7'); }, /mission"\.data\.tracks\[0\]\.items.*received 7/],
    ['timeline', (data) => { data.entries.push({ year: 'A', focus: 'A', color: 'blue' }, { year: 'B', focus: 'B', color: 'blue' }, { year: 'C', focus: 'C', color: 'blue' }); }, /timeline"\.data\.entries.*received 6/],
    ['radar', (data) => { data.stats.push({ label: 'Extra', value: 1, color: 'blue' }); }, /radar"\.data\.stats.*received 5/],
    ['skills', (data) => { data.trees.push({ name: 'Extra', items: ['A'], color: 'blue' }); }, /skills"\.data\.trees.*received 3/],
    ['projects', (data) => { data.entries.push({ name: 'Extra', description: 'Extra', tags: ['A'], color: 'blue' }); }, /projects"\.data\.entries.*received 4/],
    ['footer', (data) => { data.slogan = 'F'.repeat(81); }, /footer"\.data\.slogan.*received 81/],
  ];

  for (const [id, mutate, pattern] of cases) {
    const config = cloneConfig();
    mutate(config.sections.find((section) => section.id === id).data);
    assert.throws(() => validateProfileConfig(config, registry), pattern, id);
  }
});

test('Timeline 五节点长文案使用有限换行且测量高度覆盖渲染内容', () => {
  const config = cloneConfig();
  const timeline = config.sections.find((section) => section.id === 'timeline');
  timeline.data.entries.push(
    { year: 'Next', focus: 'Supercalifragilisticexpialidocious', color: 'green' },
    { year: '未来 🚀', focus: '中文长文案验证相邻节点不会发生文字重叠', color: 'gold' },
  );
  validateProfileConfig(config, registry);
  const result = renderProfile(config);

  parseSvg(result.svg);
  assert.ok(result.height >= 1546);
  assert.match(result.svg, /Supercalif/);
  assert.match(result.svg, /…/u);
});
