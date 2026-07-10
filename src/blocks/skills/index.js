const { circle, group, line, rect, text } = require('../../utils/svg');

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
    const startY = 126;
    const gap = 28;
    const items = tree.items.map((item, itemIndex) => {
      const y = startY + itemIndex * gap;

      return group([
        line({ x1: x + 20, y1: y - 5, x2: x + 42, y2: y - 5, stroke: colors.border }),
        circle({ cx: x + 46, cy: y - 5, r: 3.5, fill: accent }),
        text(item, { x: x + 60, y, fill: colors.text, 'font-family': fonts.mono, 'font-size': 13 }),
      ]);
    });

    return group([
      rect({ x, y: 68, width: 150, height: 34, fill: accent }),
      text(tree.name, { x: x + 16, y: 91, fill: colors.primary, 'font-family': fonts.mono, 'font-size': 14, 'font-weight': 700 }),
      line({ x1: x + 20, y1: 102, x2: x + 20, y2: startY + (tree.items.length - 1) * gap - 5, stroke: colors.border }),
      items,
    ]);
  });

  return group([
    rect({ width, height, fill: colors.card }),
    line({ x1: gutter, y1: 0, x2: gutter, y2: height, stroke: colors.border }),
    line({ x1: width - gutter, y1: 0, x2: width - gutter, y2: height, stroke: colors.border }),
    text(data.title, { x: 60, y: 42, fill: colors.primary, 'font-family': fonts.display, 'font-size': 28, 'font-weight': 750 }),
    text(data.eyebrow, { x: 800, y: 40, fill: colors.text, opacity: 0.62, 'font-family': fonts.mono, 'font-size': 11, 'text-anchor': 'end' }),
    branches,
  ], { id: 'skills', transform: `translate(0 ${offsetY})` });
}

module.exports = { measure, render };
