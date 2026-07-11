const { circle, group, line, rect, text } = require('../../utils/svg');
const { truncateText } = require('../../text');

const skillTreeLayout = {
  startY: 126,
  gap: 28,
  bottomPadding: 18,
};

function shouldUseSkillColumns(itemCount, { startY, gap, height, bottomPadding }) {
  const singleColumnLastY = startY + (itemCount - 1) * gap;
  const availableBottom = height - bottomPadding;
  return singleColumnLastY > availableBottom;
}

function measure(_section, { layout }) {
  return { height: layout.blockHeights.skills };
}

function render(section, { theme, layout, offsetY, height }) {
  const { data } = section;
  const { colors, fonts } = theme;
  const { width, gutter } = layout.canvas;
  const positions = [60, 450];
  const branches = data.trees.map((tree, index) => {
    const x = positions[index];
    const accent = colors[tree.color];
    const { startY, gap, bottomPadding } = skillTreeLayout;
    const compact = shouldUseSkillColumns(tree.items.length, {
      startY,
      gap,
      height,
      bottomPadding,
    });
    const items = tree.items.map((item, itemIndex) => {
      const column = compact && itemIndex >= 3 ? 1 : 0;
      const row = compact ? itemIndex % 3 : itemIndex;
      const branchX = x + column * 190;
      const y = startY + row * gap;
      const maxWidth = column ? 90 : (compact ? 120 : 290);
      const fitted = truncateText(item, { maxWidth, fontSize: 13, family: fonts.mono }).text;

      return group([
        line({ x1: branchX + 20, y1: y - 5, x2: branchX + 42, y2: y - 5, stroke: colors.border }),
        circle({ cx: branchX + 46, cy: y - 5, r: 3.5, fill: accent }),
        text(fitted, { x: branchX + 60, y, fill: colors.text, 'font-family': fonts.mono, 'font-size': 13 }),
      ]);
    });
    const branchLines = compact
      ? [0, 1].map((column) => line({
        x1: x + 20 + column * 190,
        y1: 102,
        x2: x + 20 + column * 190,
        y2: startY + 2 * gap - 5,
        stroke: colors.border,
      }))
      : line({ x1: x + 20, y1: 102, x2: x + 20, y2: startY + (tree.items.length - 1) * gap - 5, stroke: colors.border });
    const name = truncateText(tree.name, { maxWidth: 118, fontSize: 14, fontWeight: 700, family: fonts.mono }).text;

    return group([
      rect({ x, y: 68, width: 150, height: 34, fill: accent }),
      text(name, { x: x + 16, y: 91, fill: colors.primary, 'font-family': fonts.mono, 'font-size': 14, 'font-weight': 700 }),
      branchLines,
      items,
    ]);
  });

  return group([
    rect({ width, height, fill: colors.card }),
    line({ x1: gutter, y1: 0, x2: gutter, y2: height, stroke: colors.border }),
    line({ x1: width - gutter, y1: 0, x2: width - gutter, y2: height, stroke: colors.border }),
    text(truncateText(data.title, { maxWidth: 520, fontSize: 28, fontWeight: 750, family: fonts.display }).text, { x: 60, y: 42, fill: colors.primary, 'font-family': fonts.display, 'font-size': 28, 'font-weight': 750 }),
    text(truncateText(data.eyebrow, { maxWidth: 190, fontSize: 11, family: fonts.mono }).text, { x: 800, y: 40, fill: colors.text, opacity: 0.62, 'font-family': fonts.mono, 'font-size': 11, 'text-anchor': 'end' }),
    branches,
  ], { id: 'skills', transform: `translate(0 ${offsetY})` });
}

module.exports = { measure, render, shouldUseSkillColumns };
