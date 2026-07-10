const fs = require('node:fs');
const path = require('node:path');
const { loadConfig, resolvePath } = require('./config/load-config');
const { renderProfile } = require('./renderer/generate-profile');

function atomicWrite(outputPath, content) {
  const directory = path.dirname(outputPath);
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;

  fs.mkdirSync(directory, { recursive: true });
  try {
    fs.writeFileSync(temporaryPath, content, 'utf8');
    fs.renameSync(temporaryPath, outputPath);
  } catch (error) {
    fs.rmSync(temporaryPath, { force: true });
    throw error;
  }
}

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

module.exports = { generateProfile, renderProfile, validateProfile };
