const YAML = require('yaml');
const { getEditorManifest } = require('./manifest');

function copyFieldValue(value, field) {
  if (field.control === 'object-list') {
    return value.map((item) => orderFields(item, field.itemFields));
  }
  if (field.control === 'string-list') {
    return [...value];
  }
  return value;
}

function orderFields(source, fields) {
  return Object.fromEntries(fields
    .filter((field) => source[field.key] !== undefined && source[field.key] !== null)
    .map((field) => [field.key, copyFieldValue(source[field.key], field)]));
}

function findVariant(manifest, section) {
  const block = manifest.blocks.find((entry) => entry.type === section.type);
  return block?.variants.find((entry) => entry.value === section.variant);
}

function orderProfileConfig(config, manifest = getEditorManifest()) {
  return {
    page: orderFields(config.page, manifest.page.fields),
    theme: orderFields(config.theme, manifest.theme.fields),
    sections: config.sections.map((section) => {
      const variant = findVariant(manifest, section);
      return {
        id: section.id,
        type: section.type,
        enabled: section.enabled,
        variant: section.variant,
        data: orderFields(section.data, variant.fields),
      };
    }),
  };
}

function serializeProfileConfig(config, manifest = getEditorManifest()) {
  const ordered = orderProfileConfig(config, manifest);
  const source = YAML.stringify(ordered, { indent: 2, lineWidth: 0 });
  return `${source.trimEnd()}\n`;
}

module.exports = { orderProfileConfig, serializeProfileConfig };
