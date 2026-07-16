const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');
const { loadConfig } = require('../src/config/load-config');
const { getEditorManifest } = require('../src/editor/manifest');

let utils;

test.before(async () => {
  const modulePath = path.resolve(__dirname, '..', 'editor', 'src', 'utils', 'editor-utils.mjs');
  utils = await import(pathToFileURL(modulePath).href);
});

test('配置路径读写保持原对象不变', () => {
  const source = { page: { title: 'Before' }, sections: [{ data: { title: 'Header' } }] };
  const next = utils.setAtPath(source, 'sections[0].data.title', 'After');

  assert.equal(utils.getAtPath(next, 'sections[0].data.title'), 'After');
  assert.equal(source.sections[0].data.title, 'Header');
  assert.notEqual(next, source);
});

test('深拷贝可以处理 Vue 风格的响应式 Proxy', () => {
  const source = new Proxy({
    page: new Proxy({ title: 'Proxy Profile' }, {}),
    sections: [new Proxy({ enabled: true }, {})],
  }, {});

  const clone = utils.deepClone(source);
  assert.deepEqual(clone, {
    page: { title: 'Proxy Profile' },
    sections: [{ enabled: true }],
  });
});

test('配置指纹忽略对象键顺序但保留数组顺序', () => {
  const left = { b: 2, a: 1, list: ['x', 'y'] };
  const right = { list: ['x', 'y'], a: 1, b: 2 };
  const reordered = { a: 1, b: 2, list: ['y', 'x'] };

  assert.equal(utils.configFingerprint(left), utils.configFingerprint(right));
  assert.notEqual(utils.configFingerprint(left), utils.configFingerprint(reordered));
});

test('七类控件都能产生确定的最小默认值', () => {
  assert.equal(utils.defaultValueForField({ control: 'text' }), '新内容');
  assert.equal(utils.defaultValueForField({ control: 'textarea' }), '新内容');
  assert.equal(utils.defaultValueForField({ control: 'number', constraints: { min: 3 } }), 3);
  assert.equal(utils.defaultValueForField({ control: 'toggle' }), true);
  assert.equal(utils.defaultValueForField({ control: 'select', options: [{ value: 'blue' }] }), 'blue');
  assert.deepEqual(utils.defaultValueForField({ control: 'string-list' }), ['新条目']);
  assert.deepEqual(utils.defaultValueForField({
    control: 'object-list',
    itemFields: [
      { key: 'name', control: 'text' },
      { key: 'count', control: 'number', constraints: { min: 1 } },
      { key: 'tags', control: 'string-list' },
    ],
  }), [{ name: '新内容', count: 1, tags: ['新条目'] }]);
});

test('字符串列表和对象列表支持增删与稳定移动', () => {
  const source = [{ id: 'a' }, { id: 'b' }];
  const added = utils.addListItem(source, { id: 'c' });
  const moved = utils.moveListItem(added, 2, -1);
  const removed = utils.removeListItem(moved, 0);

  assert.deepEqual(source, [{ id: 'a' }, { id: 'b' }]);
  assert.deepEqual(added.map((item) => item.id), ['a', 'b', 'c']);
  assert.deepEqual(moved.map((item) => item.id), ['a', 'c', 'b']);
  assert.deepEqual(removed.map((item) => item.id), ['c', 'b']);
  assert.deepEqual(utils.moveListItem(source, 0, -1), source);
});

test('本地约束校验与现有 Manifest 对齐', () => {
  const configPath = path.resolve(__dirname, '..', 'examples', 'jian1202', 'profile.yaml');
  const config = loadConfig(configPath);
  const manifest = getEditorManifest();

  assert.deepEqual(utils.validateEditorConfig(config, manifest), []);

  const invalid = structuredClone(config);
  invalid.sections[1].id = invalid.sections[0].id;
  invalid.sections[3].data.languages[0].percent = 10;
  invalid.sections[4].data.trees[0].items.push('x'.repeat(29));
  const errors = utils.validateEditorConfig(invalid, manifest);

  assert.ok(errors.some((error) => error.path === 'sections[1].id'));
  assert.ok(errors.some((error) => error.path === 'sections[3].data.languages'));
  assert.ok(errors.some((error) => error.path === 'sections[4].data.trees[0].items[4]'));
});

test('数字空值不会被当成 0 且列表容量即时报错', () => {
  const errors = [];
  utils.validateFieldValue({
    label: '数值',
    control: 'number',
    required: true,
    constraints: { min: 0, max: 10 },
  }, undefined, 'value', errors);
  utils.validateFieldValue({
    label: '列表',
    control: 'string-list',
    required: true,
    constraints: { minItems: 1, maxItems: 2 },
    item: { constraints: { minLength: 1, maxLength: 4 } },
  }, ['ok', 'fine', 'extra'], 'items', errors);

  assert.ok(errors.some((error) => error.path === 'value'));
  assert.ok(errors.some((error) => error.path === 'items'));
  assert.ok(errors.some((error) => error.path === 'items[2]'));
});

test('错误路径可精确匹配或包含子字段', () => {
  const errors = [
    { path: 'sections[1].data.title', message: '标题错误' },
    { path: 'sections[1].data.items[0]', message: '条目错误' },
  ];

  assert.equal(utils.errorsAtPath(errors, 'sections[1].data.title').length, 1);
  assert.equal(utils.errorsAtPath(errors, 'sections[1].data').length, 0);
  assert.equal(utils.errorsAtPath(errors, 'sections[1].data', { includeChildren: true }).length, 2);
});

test('较旧的渲染请求不能覆盖较新的结果', () => {
  const guard = utils.createLatestRequestGuard();
  const first = guard.begin();
  const second = guard.begin();

  assert.equal(first.isLatest(), false);
  assert.equal(second.isLatest(), true);
  guard.invalidate();
  assert.equal(second.isLatest(), false);
});
