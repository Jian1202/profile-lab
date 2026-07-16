const fs = require('node:fs');
const path = require('node:path');
const packageJson = require('../../package.json');
const { loadConfig, resolvePath } = require('../config/load-config');
const { validateProfileConfig } = require('../config/schema');
const { registry } = require('../registry');
const { renderProfile } = require('../renderer/generate-profile');
const { sha256 } = require('../utils/files');
const { EditorError, invalidConfigError } = require('./errors');
const { getEditorManifest } = require('./manifest');
const { serializeProfileConfig } = require('./serialization');
const { restoreProfileFiles, saveProfileFiles } = require('./transaction');

function validateAndRender(config) {
  let validated;
  try {
    validated = validateProfileConfig(structuredClone(config), registry);
    return { config: validated, ...renderProfile(validated) };
  } catch (error) {
    throw invalidConfigError(error);
  }
}

class EditorSession {
  constructor({ configPath, outputPath, transactionHooks = {} }) {
    this.configPath = resolvePath(configPath, 'config');
    this.outputPath = resolvePath(outputPath, 'output');
    if (path.resolve(this.configPath) === path.resolve(this.outputPath)) {
      throw new EditorError('INVALID_TARGETS', '配置文件与 SVG 输出不能使用同一路径。');
    }

    this.transactionHooks = transactionHooks;
    this.rollbackSnapshot = null;
    this.manifest = getEditorManifest();
    this.manifestJson = JSON.stringify(this.manifest);
    this.manifestHash = sha256(this.manifestJson);

    const config = loadConfig(this.configPath);
    renderProfile(config);
  }

  getSession() {
    return {
      generatorVersion: packageJson.version,
      configFileName: path.basename(this.configPath),
      outputFileName: path.basename(this.outputPath),
      canRollback: Boolean(this.rollbackSnapshot),
    };
  }

  getManifest() {
    return {
      manifest: structuredClone(this.manifest),
      json: this.manifestJson,
      hash: this.manifestHash,
      etag: `"${this.manifestHash}"`,
    };
  }

  getConfig() {
    const source = fs.readFileSync(this.configPath);
    return {
      config: loadConfig(this.configPath),
      configHash: sha256(source),
    };
  }

  validate(config) {
    const result = validateAndRender(config);
    return {
      valid: true,
      width: result.width,
      height: result.height,
    };
  }

  render(config) {
    const result = validateAndRender(config);
    return {
      svg: result.svg,
      width: result.width,
      height: result.height,
      svgHash: sha256(result.svg),
    };
  }

  save(config) {
    const rendered = validateAndRender(config);
    const source = serializeProfileConfig(rendered.config, this.manifest);
    const snapshot = saveProfileFiles({
      configPath: this.configPath,
      configContent: source,
      outputPath: this.outputPath,
      outputContent: rendered.svg,
      beforeApply: this.transactionHooks.beforeSaveApply,
    });

    this.rollbackSnapshot = snapshot;
    const savedConfig = loadConfig(this.configPath);
    return {
      config: savedConfig,
      configHash: sha256(source),
      svgHash: sha256(rendered.svg),
      canRollback: true,
    };
  }

  rollback() {
    if (!this.rollbackSnapshot) {
      throw new EditorError('NO_ROLLBACK', '当前会话没有可回滚的保存记录。', { status: 409 });
    }

    const snapshot = this.rollbackSnapshot;
    restoreProfileFiles({
      configPath: this.configPath,
      outputPath: this.outputPath,
      snapshot,
      beforeApply: this.transactionHooks.beforeRollbackApply,
    });

    const configSource = fs.readFileSync(this.configPath);
    const config = loadConfig(this.configPath);
    const rendered = renderProfile(config);
    this.rollbackSnapshot = null;
    return {
      config,
      configHash: sha256(configSource),
      svg: rendered.svg,
      width: rendered.width,
      height: rendered.height,
      svgHash: sha256(rendered.svg),
      canRollback: false,
    };
  }
}

module.exports = { EditorSession, validateAndRender };
