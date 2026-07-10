const { boolean, fail, keys, list, object, string } = require('./assert');

function validateProfileConfig(config, registry) {
  keys(config, 'config', ['page', 'sections', 'theme']);
  keys(config.page, 'page', ['description', 'subtitle', 'title']);
  Object.entries(config.page).forEach(([key, value]) => string(value, `page.${key}`));
  keys(config.theme, 'theme', ['preset']);
  string(config.theme.preset, 'theme.preset');
  list(config.sections, 'sections');

  const ids = new Set();
  let enabledCount = 0;

  config.sections.forEach((section, index) => {
    const path = `sections[${index}]`;
    keys(section, path, ['data', 'enabled', 'id', 'type', 'variant']);
    string(section.id, `${path}.id`);
    string(section.type, `${path}.type`);
    string(section.variant, `${path}.variant`);
    boolean(section.enabled, `${path}.enabled`);
    object(section.data, `${path}.data`);

    if (ids.has(section.id)) {
      fail(`${path}.id`, `"${section.id}" is duplicated.`);
    }
    ids.add(section.id);

    const block = registry[section.type];
    if (!block) {
      fail(`${path} "${section.id}".type`, `"${section.type}" is unknown.`);
    }
    if (!block.variants[section.variant]) {
      fail(`${path} "${section.id}".variant`, `"${section.variant}" is unknown for type "${section.type}".`);
    }

    block.validate(section, `${path} "${section.id}"`);
    enabledCount += section.enabled ? 1 : 0;
  });

  if (!enabledCount) {
    fail('sections', 'must contain at least one enabled section.');
  }

  return config;
}

module.exports = { validateProfileConfig };
