const { getEditorManifest } = require('./manifest');
const {
  EDITOR_MANIFEST_NAME,
  EDITOR_MANIFEST_VERSION,
  validateEditorManifest,
} = require('./validate-manifest');

module.exports = {
  EDITOR_MANIFEST_NAME,
  EDITOR_MANIFEST_VERSION,
  getEditorManifest,
  validateEditorManifest,
};
