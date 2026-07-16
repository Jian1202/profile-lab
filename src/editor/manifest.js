const packageJson = require('../../package.json');
const { registry } = require('../registry');
const { presets } = require('../themes');
const {
  BLOCK_ORDER,
  CONTROL_TYPES,
  createSectionDefinition,
  createThemeDefinition,
  editorDefinitions,
  pageDefinition,
} = require('./definitions');
const {
  EDITOR_MANIFEST_NAME,
  EDITOR_MANIFEST_VERSION,
  validateEditorManifest,
} = require('./validate-manifest');

function fail(manifestPath, message) {
  throw new Error(`Invalid editor manifest: ${manifestPath} ${message}`);
}

function sameValues(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function buildBlocks() {
  const registryTypes = Object.keys(registry);
  const definitionTypes = Object.keys(editorDefinitions);

  if (!sameValues(registryTypes, definitionTypes) || !sameValues(registryTypes, BLOCK_ORDER)) {
    fail('blocks', 'registry, definitions and stable block order must contain the same types.');
  }

  return BLOCK_ORDER.map((type, blockIndex) => {
    const entry = registry[type];
    const definition = entry.editor;
    const variants = Object.keys(entry.variants);
    const definedVariants = Object.keys(definition?.variants || {});

    if (!definition) {
      fail(`blocks[${blockIndex}]`, `registry type "${type}" has no editor definition.`);
    }
    if (!sameValues(variants, definedVariants)) {
      fail(`blocks[${blockIndex}].variants`, 'registry and editor definition variants must match.');
    }

    return {
      type,
      label: definition.label,
      variants: variants.map((value) => ({
        value,
        label: definition.variants[value].label,
        fields: definition.variants[value].fields,
        rules: definition.variants[value].rules,
      })),
    };
  });
}

function buildManifest() {
  const blocks = buildBlocks();
  return {
    contract: {
      name: EDITOR_MANIFEST_NAME,
      version: EDITOR_MANIFEST_VERSION,
    },
    generatorVersion: packageJson.version,
    controls: [...CONTROL_TYPES],
    page: pageDefinition,
    theme: createThemeDefinition(Object.keys(presets)),
    section: createSectionDefinition(blocks),
    blocks,
  };
}

const manifestTemplate = buildManifest();
validateEditorManifest(manifestTemplate);

function getEditorManifest() {
  return structuredClone(manifestTemplate);
}

module.exports = { getEditorManifest };
