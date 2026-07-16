const { loadConfig, resolvePath } = require('./config/load-config');
const { getEditorManifest } = require('./editor');
const { renderProfile } = require('./renderer/generate-profile');
const { atomicWrite } = require('./utils/files');

function validateProfile({ configPath } = {}) {
  const resolvedConfigPath = resolvePath(configPath, 'config');
  const config = loadConfig(resolvedConfigPath);
  const rendered = renderProfile(config);

  return { config, configPath: resolvedConfigPath, ...rendered };
}

function generateProfile({ configPath, outputPath } = {}) {
  const validated = validateProfile({ configPath });
  const resolvedOutputPath = resolvePath(outputPath, 'output');

  atomicWrite(resolvedOutputPath, validated.svg);
  return { ...validated, outputPath: resolvedOutputPath };
}

module.exports = {
  generateProfile,
  getEditorManifest,
  renderProfile,
  validateProfile,
};
