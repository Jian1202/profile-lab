const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');
const { registry } = require('../registry');
const { validateProfileConfig } = require('./schema');

function resolvePath(filePath, label) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new Error(`${label} 路径不能为空。`);
  }

  return path.isAbsolute(filePath) ? path.normalize(filePath) : path.resolve(process.cwd(), filePath);
}

function configError(configPath, error) {
  const line = error.linePos?.start?.line || error.linePos?.[0]?.line;
  const location = line ? ` 第 ${line} 行` : '';
  return new Error(`无法解析配置文件 ${configPath}${location}：${error.message}`);
}

function loadConfig(configPath) {
  const resolvedPath = resolvePath(configPath, 'config');
  let source;

  try {
    source = fs.readFileSync(resolvedPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`配置文件不存在：${resolvedPath}`);
    }
    throw error;
  }

  const document = YAML.parseDocument(source, { prettyErrors: true });
  if (document.errors.length) {
    throw configError(resolvedPath, document.errors[0]);
  }

  return validateProfileConfig(document.toJS(), registry);
}

module.exports = { loadConfig, resolvePath };
