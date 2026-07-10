const layout = require('../layout');
const { getBlock } = require('../registry');
const { getTheme } = require('../themes');
const { svgDocument } = require('../utils/svg');

function measureSection(section, context) {
  const block = getBlock(section);
  const size = block.measure(section, context);

  if (!size || !Number.isFinite(size.height) || size.height <= 0) {
    throw new Error(`区块 ${section.id} 返回了非法高度。`);
  }

  return { block, size };
}

function renderProfile(config) {
  const theme = getTheme(config.theme.preset);
  const enabledSections = config.sections.filter((section) => section.enabled);
  let offsetY = layout.pageTop;
  const fragments = [];

  for (const section of enabledSections) {
    const baseContext = { theme, layout, offsetY };
    const { block, size } = measureSection(section, baseContext);
    fragments.push(block.render(section, { ...baseContext, height: size.height }));
    offsetY += size.height + layout.sectionGap;
  }

  const height = offsetY - layout.sectionGap;
  return {
    enabledSections,
    height,
    width: layout.canvas.width,
    svg: svgDocument({
      width: layout.canvas.width,
      height,
      title: config.page.title,
      description: config.page.description,
      children: fragments,
    }),
  };
}

module.exports = { renderProfile };
