const lightBlue = require('./light-blue');

const presets = {
  'light-blue': lightBlue,
};

function getTheme(preset) {
  const theme = presets[preset];

  if (!theme) {
    throw new Error(`未知主题 preset：${preset}`);
  }

  return theme;
}

module.exports = { getTheme, presets };
