const path = require('node:path');
const { registry } = require('../registry');
const { BLOCK_ORDER, CONTROL_TYPES } = require('./definitions');

const EDITOR_MANIFEST_NAME = 'profile-lab/editor-manifest';
const EDITOR_MANIFEST_VERSION = 1;

function fail(manifestPath, message) {
  throw new Error(`Invalid editor manifest: ${manifestPath} ${message}`);
}

function isPlainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function requireObject(value, manifestPath) {
  if (!isPlainObject(value)) {
    fail(manifestPath, 'must be a plain object.');
  }
}

function requireArray(value, manifestPath, { nonEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    fail(manifestPath, 'must be an array.');
  }
  if (nonEmpty && value.length === 0) {
    fail(manifestPath, 'must not be empty.');
  }
}

function requireString(value, manifestPath) {
  if (typeof value !== 'string' || !value.trim()) {
    fail(manifestPath, 'must be a non-empty string.');
  }
}

function requireUnique(values, manifestPath) {
  const seen = new Set();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      fail(`${manifestPath}[${index}]`, `duplicates "${value}".`);
    }
    seen.add(value);
  });
}

function assertJsonSafe(value, manifestPath = 'manifest', ancestors = new Set()) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    if (typeof value === 'string'
      && (path.win32.isAbsolute(value) || path.posix.isAbsolute(value))) {
      fail(manifestPath, 'must not contain an absolute path.');
    }
    return;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      fail(manifestPath, 'must be a finite number.');
    }
    return;
  }

  if (typeof value !== 'object') {
    fail(manifestPath, `contains unsupported ${typeof value}.`);
  }

  if (ancestors.has(value)) {
    fail(manifestPath, 'must not contain circular references.');
  }
  if (!Array.isArray(value) && !isPlainObject(value)) {
    fail(manifestPath, `contains unsupported ${value.constructor?.name || 'object'}.`);
  }

  ancestors.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) {
        fail(`${manifestPath}[${index}]`, 'must not be a sparse array item.');
      }
      assertJsonSafe(value[index], `${manifestPath}[${index}]`, ancestors);
    }
    Reflect.ownKeys(value).forEach((key) => {
      if (key !== 'length' && (typeof key === 'symbol' || !/^\d+$/.test(key))) {
        fail(manifestPath, 'must not contain non-JSON array properties.');
      }
    });
  } else {
    Reflect.ownKeys(value).forEach((key) => {
      if (typeof key === 'symbol') {
        fail(manifestPath, 'must not contain symbol keys.');
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor.enumerable) {
        fail(`${manifestPath}.${key}`, 'must be enumerable JSON data.');
      }
      assertJsonSafe(value[key], `${manifestPath}.${key}`, ancestors);
    });
  }
  ancestors.delete(value);
}

function validateConstraints(constraints, manifestPath) {
  if (constraints === undefined) {
    return;
  }

  requireObject(constraints, manifestPath);
  Object.entries(constraints).forEach(([key, value]) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      fail(`${manifestPath}.${key}`, 'must be a finite number.');
    }
  });

  const ranges = [
    ['minLength', 'maxLength'],
    ['minItems', 'maxItems'],
    ['min', 'max'],
  ];
  ranges.forEach(([minimum, maximum]) => {
    if (constraints[minimum] !== undefined
      && constraints[maximum] !== undefined
      && constraints[minimum] > constraints[maximum]) {
      fail(manifestPath, `${minimum} must not exceed ${maximum}.`);
    }
  });

  if (constraints.step !== undefined && constraints.step <= 0) {
    fail(`${manifestPath}.step`, 'must be greater than 0.');
  }
}

function validateOptions(options, manifestPath) {
  requireArray(options, manifestPath, { nonEmpty: true });
  const values = [];
  options.forEach((option, index) => {
    const optionPath = `${manifestPath}[${index}]`;
    requireObject(option, optionPath);
    requireString(option.value, `${optionPath}.value`);
    requireString(option.label, `${optionPath}.label`);
    values.push(option.value);
  });
  requireUnique(values, `${manifestPath}.values`);
}

function validateStringListItem(item, manifestPath, controls) {
  requireObject(item, manifestPath);
  if (item.control !== 'text' || !controls.has(item.control)) {
    fail(`${manifestPath}.control`, 'must be "text".');
  }
  validateConstraints(item.constraints, `${manifestPath}.constraints`);
  if (Object.hasOwn(item, 'itemFields')) {
    fail(`${manifestPath}.itemFields`, 'is not allowed for a string-list item.');
  }
}

function validateFieldGroup(fields, manifestPath, controls, { nested = false } = {}) {
  requireArray(fields, manifestPath, { nonEmpty: true });
  const paths = [];

  fields.forEach((field, index) => {
    const fieldPath = `${manifestPath}[${index}]`;
    requireObject(field, fieldPath);
    requireString(field.key, `${fieldPath}.key`);
    requireString(field.path, `${fieldPath}.path`);
    requireString(field.label, `${fieldPath}.label`);
    requireString(field.control, `${fieldPath}.control`);
    if (!controls.has(field.control)) {
      fail(`${fieldPath}.control`, `"${field.control}" is unsupported.`);
    }
    if (typeof field.required !== 'boolean') {
      fail(`${fieldPath}.required`, 'must be a boolean.');
    }
    validateConstraints(field.constraints, `${fieldPath}.constraints`);
    paths.push(field.path);

    if (field.control === 'select') {
      const hasOptions = Object.hasOwn(field, 'options');
      const hasDynamicOptions = Object.hasOwn(field, 'dynamicOptions');
      if (hasOptions === hasDynamicOptions) {
        fail(fieldPath, 'select must define exactly one of options or dynamicOptions.');
      }
      if (hasOptions) {
        validateOptions(field.options, `${fieldPath}.options`);
      } else {
        requireString(field.dynamicOptions, `${fieldPath}.dynamicOptions`);
      }
    } else if (Object.hasOwn(field, 'options') || Object.hasOwn(field, 'dynamicOptions')) {
      fail(fieldPath, 'only select controls may define options.');
    }

    if (field.control === 'string-list') {
      validateStringListItem(field.item, `${fieldPath}.item`, controls);
    } else if (Object.hasOwn(field, 'item')) {
      fail(`${fieldPath}.item`, 'is only allowed for string-list controls.');
    }

    if (field.control === 'object-list') {
      if (nested) {
        fail(`${fieldPath}.control`, 'nested object-list controls are not supported.');
      }
      validateFieldGroup(field.itemFields, `${fieldPath}.itemFields`, controls, { nested: true });
    } else if (Object.hasOwn(field, 'itemFields')) {
      fail(`${fieldPath}.itemFields`, 'is only allowed for object-list controls.');
    }
  });

  requireUnique(paths, `${manifestPath}.paths`);
}

function validateRules(rules, manifestPath) {
  requireArray(rules, manifestPath);
  const ids = [];
  rules.forEach((rule, index) => {
    const rulePath = `${manifestPath}[${index}]`;
    requireObject(rule, rulePath);
    ['id', 'kind', 'path', 'field', 'message'].forEach((key) => {
      requireString(rule[key], `${rulePath}.${key}`);
    });
    ['target', 'tolerance'].forEach((key) => {
      if (!Number.isFinite(rule[key])) {
        fail(`${rulePath}.${key}`, 'must be a finite number.');
      }
    });
    ids.push(rule.id);
  });
  requireUnique(ids, `${manifestPath}.ids`);
}

function sorted(values) {
  return [...values].sort();
}

function requireSameValues(actual, expected, manifestPath) {
  if (JSON.stringify(sorted(actual)) !== JSON.stringify(sorted(expected))) {
    fail(manifestPath, `must match: ${expected.join(', ')}.`);
  }
}

function validateRegistryAlignment(blocks) {
  const manifestTypes = blocks.map((block) => block.type);
  const registryTypes = Object.keys(registry);
  requireSameValues(manifestTypes, registryTypes, 'blocks');

  if (JSON.stringify(manifestTypes) !== JSON.stringify(BLOCK_ORDER)) {
    fail('blocks', `must use the stable order: ${BLOCK_ORDER.join(', ')}.`);
  }

  blocks.forEach((block, blockIndex) => {
    const entry = registry[block.type];
    if (!entry.editor) {
      fail(`blocks[${blockIndex}]`, `registry type "${block.type}" has no editor definition.`);
    }
    const registryVariants = Object.keys(entry.variants);
    const definitionVariants = Object.keys(entry.editor.variants || {});
    const manifestVariants = block.variants.map((variant) => variant.value);
    requireSameValues(definitionVariants, registryVariants, `blocks[${blockIndex}].editor.variants`);
    requireSameValues(manifestVariants, registryVariants, `blocks[${blockIndex}].variants`);
  });
}

function validateEditorManifest(manifest) {
  assertJsonSafe(manifest);
  requireObject(manifest, 'manifest');

  ['contract', 'generatorVersion', 'controls', 'page', 'theme', 'section', 'blocks'].forEach((key) => {
    if (!Object.hasOwn(manifest, key)) {
      fail('manifest', `must contain ${key}.`);
    }
  });

  requireObject(manifest.contract, 'contract');
  if (manifest.contract.name !== EDITOR_MANIFEST_NAME) {
    fail('contract.name', `must be "${EDITOR_MANIFEST_NAME}".`);
  }
  if (manifest.contract.version !== EDITOR_MANIFEST_VERSION) {
    fail('contract.version', `must be ${EDITOR_MANIFEST_VERSION}.`);
  }
  requireString(manifest.generatorVersion, 'generatorVersion');

  requireArray(manifest.controls, 'controls', { nonEmpty: true });
  manifest.controls.forEach((control, index) => requireString(control, `controls[${index}]`));
  requireUnique(manifest.controls, 'controls');
  if (JSON.stringify(manifest.controls) !== JSON.stringify(CONTROL_TYPES)) {
    fail('controls', `must equal: ${CONTROL_TYPES.join(', ')}.`);
  }
  const controls = new Set(manifest.controls);

  requireObject(manifest.page, 'page');
  requireString(manifest.page.label, 'page.label');
  validateFieldGroup(manifest.page.fields, 'page.fields', controls);

  requireObject(manifest.theme, 'theme');
  requireString(manifest.theme.label, 'theme.label');
  validateFieldGroup(manifest.theme.fields, 'theme.fields', controls);

  requireObject(manifest.section, 'section');
  requireString(manifest.section.label, 'section.label');
  validateFieldGroup(manifest.section.commonFields, 'section.commonFields', controls);

  requireArray(manifest.blocks, 'blocks', { nonEmpty: true });
  const blockTypes = [];
  manifest.blocks.forEach((block, blockIndex) => {
    const blockPath = `blocks[${blockIndex}]`;
    requireObject(block, blockPath);
    requireString(block.type, `${blockPath}.type`);
    requireString(block.label, `${blockPath}.label`);
    requireArray(block.variants, `${blockPath}.variants`, { nonEmpty: true });
    blockTypes.push(block.type);

    const variantValues = [];
    block.variants.forEach((variant, variantIndex) => {
      const variantPath = `${blockPath}.variants[${variantIndex}]`;
      requireObject(variant, variantPath);
      requireString(variant.value, `${variantPath}.value`);
      requireString(variant.label, `${variantPath}.label`);
      validateFieldGroup(variant.fields, `${variantPath}.fields`, controls);
      validateRules(variant.rules, `${variantPath}.rules`);
      variantValues.push(variant.value);
    });
    requireUnique(variantValues, `${blockPath}.variants.values`);
  });
  requireUnique(blockTypes, 'blocks.types');
  validateRegistryAlignment(manifest.blocks);

  return manifest;
}

module.exports = {
  EDITOR_MANIFEST_NAME,
  EDITOR_MANIFEST_VERSION,
  assertJsonSafe,
  validateEditorManifest,
};
