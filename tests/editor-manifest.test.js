const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const packageJson = require('../package.json');
const limits = require('../src/config/limits');
const { accentTokens } = require('../src/config/options');
const {
  generateProfile,
  getEditorManifest,
  renderProfile,
  validateProfile,
} = require('../src');
const {
  EDITOR_MANIFEST_NAME,
  EDITOR_MANIFEST_VERSION,
  validateEditorManifest,
} = require('../src/editor');
const { registry } = require('../src/registry');
const { presets } = require('../src/themes');

const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'bin', 'profile-lab.js');

function findBlock(manifest, type) {
  return manifest.blocks.find((block) => block.type === type);
}

function findVariant(manifest, type) {
  return findBlock(manifest, type).variants[0];
}

function findField(fields, fieldPath) {
  return fields.find((field) => field.path === fieldPath);
}

function collectFields(fields) {
  return fields.flatMap((field) => [
    field,
    ...(field.itemFields ? collectFields(field.itemFields) : []),
  ]);
}

function assertUniqueFieldPaths(fields) {
  const paths = fields.map((field) => field.path);
  assert.equal(new Set(paths).size, paths.length);
  fields.forEach((field) => {
    if (field.itemFields) {
      assertUniqueFieldPaths(field.itemFields);
    }
  });
}

test('Editor Manifest 顶层契约稳定且版本来自 package', () => {
  const manifest = getEditorManifest();

  assert.deepEqual(manifest.contract, {
    name: EDITOR_MANIFEST_NAME,
    version: EDITOR_MANIFEST_VERSION,
  });
  assert.equal(manifest.contract.name, 'profile-lab/editor-manifest');
  assert.equal(manifest.contract.version, 1);
  assert.equal(manifest.generatorVersion, packageJson.version);
  assert.deepEqual(manifest.controls, [
    'text',
    'textarea',
    'number',
    'toggle',
    'select',
    'string-list',
    'object-list',
  ]);
  assert.ok(manifest.page && manifest.theme && manifest.section && manifest.blocks);
});

test('Page、Theme 和 Section common fields 完整且顺序稳定', () => {
  const manifest = getEditorManifest();

  assert.deepEqual(manifest.page.fields.map((field) => field.path), ['title', 'subtitle', 'description']);
  assert.deepEqual(manifest.theme.fields.map((field) => field.path), ['preset']);
  assert.deepEqual(
    manifest.section.commonFields.map((field) => field.path),
    ['id', 'enabled', 'type', 'variant'],
  );
  assert.equal(findField(manifest.page.fields, 'description').control, 'textarea');
  assert.equal(findField(manifest.section.commonFields, 'enabled').control, 'toggle');
  assert.equal(findField(manifest.section.commonFields, 'variant').dynamicOptions, 'block.variants');
});

test('七类 Block 的顺序、label、variant 和字段数量固定', () => {
  const manifest = getEditorManifest();
  const summary = manifest.blocks.map((block) => ({
    type: block.type,
    label: block.label,
    variants: block.variants.map((variant) => variant.value),
    fieldCount: block.variants[0].fields.length,
  }));

  assert.deepEqual(summary, [
    { type: 'header', label: '页首', variants: ['default'], fieldCount: 3 },
    { type: 'mission', label: '当前方向', variants: ['cards'], fieldCount: 3 },
    { type: 'timeline', label: '成长路径', variants: ['horizontal'], fieldCount: 3 },
    { type: 'radar', label: '数据雷达', variants: ['default'], fieldCount: 4 },
    { type: 'skills', label: '技能树', variants: ['tree'], fieldCount: 3 },
    { type: 'projects', label: '项目', variants: ['drawer'], fieldCount: 3 },
    { type: 'footer', label: '页尾', variants: ['default'], fieldCount: 2 },
  ]);
});

test('Manifest 连续生成确定且返回值彼此隔离', () => {
  const first = getEditorManifest();
  const second = getEditorManifest();
  assert.equal(JSON.stringify(first), JSON.stringify(second));

  first.blocks[0].label = 'changed';
  first.page.fields[0].constraints.maxLength = 1;
  const third = getEditorManifest();
  assert.equal(third.blocks[0].label, '页首');
  assert.equal(third.page.fields[0].constraints.maxLength, limits.page.title);
});

test('Manifest 完全 JSON-safe 且不包含环境路径', () => {
  const manifest = getEditorManifest();
  const seen = new Set();

  function visit(value) {
    if (value === null || ['string', 'boolean'].includes(typeof value)) {
      if (typeof value === 'string') {
        assert.equal(path.win32.isAbsolute(value) || path.posix.isAbsolute(value), false);
      }
      return;
    }
    if (typeof value === 'number') {
      assert.equal(Number.isFinite(value), true);
      return;
    }
    assert.equal(typeof value, 'object');
    assert.equal(seen.has(value), false);
    seen.add(value);
    assert.equal(value instanceof Set, false);
    assert.equal(value instanceof Map, false);
    assert.equal(value instanceof RegExp, false);
    Object.values(value).forEach(visit);
    seen.delete(value);
  }

  visit(manifest);
  assert.deepEqual(JSON.parse(JSON.stringify(manifest)), manifest);
  assert.doesNotThrow(() => validateEditorManifest(manifest));
});

test('Manifest type 和 variant 与 Registry 双向完全对齐', () => {
  const manifest = getEditorManifest();
  assert.deepEqual(manifest.blocks.map((block) => block.type), Object.keys(registry));

  manifest.blocks.forEach((block) => {
    assert.deepEqual(
      block.variants.map((variant) => variant.value),
      Object.keys(registry[block.type].variants),
    );
    assert.ok(registry[block.type].editor);
  });
});

test('所有字段容量约束完整复用 limits.js', () => {
  const manifest = getEditorManifest();
  const maxLength = (fields, key) => findField(fields, key).constraints.maxLength;
  const itemFields = (type, key) => findField(findVariant(manifest, type).fields, key).itemFields;

  assert.deepEqual(
    manifest.page.fields.map((field) => field.constraints.maxLength),
    [limits.page.title, limits.page.subtitle, limits.page.description],
  );
  assert.deepEqual(
    findVariant(manifest, 'header').fields.map((field) => field.constraints.maxLength),
    [limits.header.title, limits.header.greeting, limits.header.subtitle],
  );

  ['mission', 'timeline', 'radar', 'skills', 'projects'].forEach((type) => {
    const fields = findVariant(manifest, type).fields;
    assert.equal(maxLength(fields, 'title'), limits.common.title);
    assert.equal(maxLength(fields, 'eyebrow'), limits.common.eyebrow);
  });

  const tracks = findField(findVariant(manifest, 'mission').fields, 'tracks');
  assert.deepEqual(tracks.constraints, { minItems: 1, maxItems: limits.mission.tracks });
  assert.equal(maxLength(tracks.itemFields, 'name'), limits.mission.trackName);
  assert.equal(findField(tracks.itemFields, 'items').constraints.maxItems, limits.mission.items);
  assert.equal(findField(tracks.itemFields, 'items').item.constraints.maxLength, limits.mission.item);

  const entries = findField(findVariant(manifest, 'timeline').fields, 'entries');
  assert.deepEqual(entries.constraints, {
    minItems: limits.timeline.entries.min,
    maxItems: limits.timeline.entries.max,
  });
  assert.equal(maxLength(entries.itemFields, 'year'), limits.timeline.year);
  assert.equal(maxLength(entries.itemFields, 'focus'), limits.timeline.focus);

  const stats = findField(findVariant(manifest, 'radar').fields, 'stats');
  const languages = findField(findVariant(manifest, 'radar').fields, 'languages');
  assert.equal(stats.constraints.maxItems, limits.radar.stats);
  assert.equal(maxLength(stats.itemFields, 'label'), limits.radar.statLabel);
  assert.equal(findField(stats.itemFields, 'value').constraints.max, limits.radar.statValue);
  assert.equal(languages.constraints.maxItems, limits.radar.languages);
  assert.equal(maxLength(languages.itemFields, 'name'), limits.radar.languageName);

  const trees = findField(findVariant(manifest, 'skills').fields, 'trees');
  assert.equal(trees.constraints.maxItems, limits.skills.trees);
  assert.equal(maxLength(trees.itemFields, 'name'), limits.skills.treeName);
  assert.equal(findField(trees.itemFields, 'items').constraints.maxItems, limits.skills.items);
  assert.equal(findField(trees.itemFields, 'items').item.constraints.maxLength, limits.skills.item);

  const projects = findField(findVariant(manifest, 'projects').fields, 'entries');
  assert.equal(projects.constraints.maxItems, limits.projects.entries);
  assert.equal(maxLength(projects.itemFields, 'name'), limits.projects.name);
  assert.equal(maxLength(projects.itemFields, 'description'), limits.projects.description);
  assert.equal(findField(projects.itemFields, 'tags').constraints.maxItems, limits.projects.tags);
  assert.equal(findField(projects.itemFields, 'tags').item.constraints.maxLength, limits.projects.tag);

  assert.deepEqual(
    findVariant(manifest, 'footer').fields.map((field) => field.constraints.maxLength),
    [limits.footer.handle, limits.footer.slogan],
  );
  assert.equal(itemFields('projects', 'entries').length, 4);
});

test('所有强调色选项统一来自 accentTokens', () => {
  const manifest = getEditorManifest();
  const colorFields = manifest.blocks.flatMap((block) => block.variants.flatMap((variant) => (
    collectFields(variant.fields).filter((field) => field.path === 'color')
  )));

  assert.ok(colorFields.length > 0);
  colorFields.forEach((field) => {
    assert.deepEqual(field.options.map((option) => option.value), accentTokens);
  });
});

test('主题和区块类型 options 分别来自 presets 与最终 blocks', () => {
  const manifest = getEditorManifest();
  const preset = findField(manifest.theme.fields, 'preset');
  const type = findField(manifest.section.commonFields, 'type');

  assert.deepEqual(preset.options.map((option) => option.value), Object.keys(presets));
  assert.deepEqual(type.options.map((option) => option.value), manifest.blocks.map((block) => block.type));
});

test('所有同级字段路径唯一且 object-list itemFields 完整', () => {
  const manifest = getEditorManifest();
  assertUniqueFieldPaths(manifest.page.fields);
  assertUniqueFieldPaths(manifest.theme.fields);
  assertUniqueFieldPaths(manifest.section.commonFields);
  manifest.blocks.forEach((block) => {
    block.variants.forEach((variant) => assertUniqueFieldPaths(variant.fields));
  });
});

test('Radar 语言总和规则使用现有 tolerance', () => {
  const rules = findVariant(getEditorManifest(), 'radar').rules;
  assert.deepEqual(rules, [{
    id: 'language-percent-total',
    kind: 'sum',
    path: 'languages',
    field: 'percent',
    target: 100,
    tolerance: limits.radar.languageTotalTolerance,
    message: '语言百分比总和必须为 100',
  }]);
});

test('Manifest 自校验会报告精确路径和非法结构', () => {
  const cases = [
    [(manifest) => { manifest.contract.version = 2; }, /contract\.version/],
    [(manifest) => { manifest.controls.push('text'); }, /controls\[7\]/],
    [(manifest) => { manifest.blocks[0].variants[0].fields[0].control = 'slider'; }, /blocks\[0\].*\.control/],
    [(manifest) => { manifest.theme.fields[0].options = []; }, /theme\.fields\[0\]\.options/],
    [(manifest) => { delete manifest.blocks[1].variants[0].fields[2].itemFields; }, /itemFields/],
    [(manifest) => { delete manifest.blocks[1].variants[0].fields[2].itemFields[1].item; }, /item/],
    [(manifest) => { manifest.page.fields[0].constraints.minLength = 100; }, /minLength/],
    [(manifest) => { manifest.page.fields[0].constraints.maxLength = Number.NaN; }, /maxLength/],
    [(manifest) => { manifest.page.fields[0].constraints.maxLength = Number.POSITIVE_INFINITY; }, /maxLength/],
    [(manifest) => { manifest.page.fields[0].help = undefined; }, /page\.fields\[0\]\.help/],
    [(manifest) => { manifest.page.fields[0].help = () => 'x'; }, /unsupported function/],
    [(manifest) => { manifest.page.fields[0].help = Symbol('x'); }, /unsupported symbol/],
    [(manifest) => { manifest.page.fields[0].help = 1n; }, /unsupported bigint/],
    [(manifest) => { manifest.page.fields[0].help = new Set(['x']); }, /unsupported Set/],
    [(manifest) => { manifest.page.fields[0].help = new Map([['x', 1]]); }, /unsupported Map/],
    [(manifest) => { manifest.page.fields[0].help = /x/; }, /unsupported RegExp/],
    [(manifest) => { manifest.page.fields[0].help = 'C:\\private\\profile.yaml'; }, /absolute path/],
    [(manifest) => { manifest.page.fields[1].path = 'title'; }, /page\.fields\.paths/],
  ];

  cases.forEach(([mutate, pattern]) => {
    const manifest = getEditorManifest();
    mutate(manifest);
    assert.throws(() => validateEditorManifest(manifest), pattern);
  });
});

test('公共 API 与 manifest CLI 输出保持一致并拒绝参数', () => {
  assert.equal(typeof generateProfile, 'function');
  assert.equal(typeof renderProfile, 'function');
  assert.equal(typeof validateProfile, 'function');
  assert.equal(typeof getEditorManifest, 'function');

  const result = spawnSync(process.execPath, [cli, 'manifest'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, `${JSON.stringify(getEditorManifest(), null, 2)}\n`);
  assert.deepEqual(JSON.parse(result.stdout), getEditorManifest());

  const invalid = spawnSync(
    process.execPath,
    [cli, 'manifest', '--config', 'example.yaml'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.notEqual(invalid.status, 0);
  assert.equal(invalid.stdout, '');
  assert.match(invalid.stderr, /manifest 命令不接受参数/);

  const help = spawnSync(process.execPath, [cli, '--help'], { cwd: root, encoding: 'utf8' });
  assert.match(help.stdout, /profile-lab manifest/);
});
