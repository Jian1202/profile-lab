const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function siblingTemporaryPath(filePath, extension = 'tmp') {
  const name = `.${path.basename(filePath)}.${process.pid}.${crypto.randomUUID()}.${extension}`;
  return path.join(path.dirname(filePath), name);
}

function atomicWrite(filePath, content) {
  const directory = path.dirname(filePath);
  const temporaryPath = siblingTemporaryPath(filePath);

  fs.mkdirSync(directory, { recursive: true });
  try {
    fs.writeFileSync(temporaryPath, content, 'utf8');
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    fs.rmSync(temporaryPath, { force: true });
    throw error;
  }
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

module.exports = { atomicWrite, sha256, siblingTemporaryPath };
