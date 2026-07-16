const fs = require('node:fs');
const path = require('node:path');
const { EditorError } = require('./errors');
const { siblingTemporaryPath } = require('../utils/files');

function readFileState(filePath) {
  try {
    return { exists: true, content: fs.readFileSync(filePath) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { exists: false, content: null };
    }
    throw error;
  }
}

function writeDurableFile(filePath, content) {
  const descriptor = fs.openSync(filePath, 'wx');
  try {
    fs.writeFileSync(descriptor, content);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function removeQuietly(filePath) {
  if (!filePath) {
    return;
  }
  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    // 清理残留文件不应掩盖原始事务结果。
  }
}

function prepareEntry(targetPath, content) {
  const normalizedContent = content === null
    ? null
    : (Buffer.isBuffer(content) ? Buffer.from(content) : Buffer.from(content, 'utf8'));
  const directory = path.dirname(targetPath);
  fs.mkdirSync(directory, { recursive: true });

  const entry = {
    targetPath,
    content: normalizedContent,
    original: readFileState(targetPath),
    temporaryPath: normalizedContent === null ? null : siblingTemporaryPath(targetPath),
    backupPath: siblingTemporaryPath(targetPath, 'bak'),
    backupCreated: false,
    applied: false,
  };

  if (entry.temporaryPath) {
    writeDurableFile(entry.temporaryPath, entry.content);
  }
  return entry;
}

function restoreEntries(entries) {
  const errors = [];

  for (const entry of [...entries].reverse()) {
    try {
      if (!entry.applied && !entry.backupCreated) {
        continue;
      }
      fs.rmSync(entry.targetPath, { force: true });
      if (entry.backupCreated && fs.existsSync(entry.backupPath)) {
        fs.renameSync(entry.backupPath, entry.targetPath);
      } else if (entry.original.exists) {
        writeDurableFile(entry.targetPath, entry.original.content);
      }
    } catch (error) {
      errors.push(error);
    }
  }

  return errors;
}

function applyFileTransaction(fileChanges, { beforeApply } = {}) {
  const targetPaths = fileChanges.map((entry) => path.resolve(entry.path));
  if (new Set(targetPaths).size !== targetPaths.length) {
    throw new EditorError('INVALID_TARGETS', '配置文件与 SVG 输出不能使用同一路径。');
  }

  const entries = [];
  try {
    fileChanges.forEach((change) => {
      entries.push(prepareEntry(path.resolve(change.path), change.content));
    });

    entries.forEach((entry, index) => {
      beforeApply?.({ index, targetPath: entry.targetPath });
      if (fs.existsSync(entry.targetPath)) {
        fs.renameSync(entry.targetPath, entry.backupPath);
        entry.backupCreated = true;
      }
      if (entry.temporaryPath) {
        fs.renameSync(entry.temporaryPath, entry.targetPath);
        entry.temporaryPath = null;
      }
      entry.applied = true;
    });

    entries.forEach((entry) => removeQuietly(entry.backupPath));
    return entries.map((entry) => ({
      exists: entry.original.exists,
      content: entry.original.content ? Buffer.from(entry.original.content) : null,
    }));
  } catch (error) {
    const restoreErrors = restoreEntries(entries);
    if (restoreErrors.length) {
      throw new EditorError(
        'TRANSACTION_RECOVERY_FAILED',
        '文件更新失败，且自动恢复未能完整完成。请检查文件权限后重新加载。',
        { status: 500 },
      );
    }
    throw error;
  } finally {
    entries.forEach((entry) => {
      removeQuietly(entry.temporaryPath);
      removeQuietly(entry.backupPath);
    });
  }
}

function saveProfileFiles({ configPath, configContent, outputPath, outputContent, beforeApply }) {
  const [config, output] = applyFileTransaction([
    { path: configPath, content: configContent },
    { path: outputPath, content: outputContent },
  ], { beforeApply });

  return { config, output };
}

function restoreProfileFiles({ configPath, outputPath, snapshot, beforeApply }) {
  return applyFileTransaction([
    { path: configPath, content: snapshot.config.exists ? snapshot.config.content : null },
    { path: outputPath, content: snapshot.output.exists ? snapshot.output.content : null },
  ], { beforeApply });
}

module.exports = {
  applyFileTransaction,
  readFileState,
  restoreProfileFiles,
  saveProfileFiles,
};
