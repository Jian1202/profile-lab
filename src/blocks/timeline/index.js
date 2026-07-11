const { circle, group, line, rect, text } = require('../../utils/svg');
const { truncateText, wrapText } = require('../../text');

function getTimelineLayout(section, fonts) {
  const count = section.data.entries.length;
  const positions = section.data.entries.map((_, index) => 150 + (560 * index) / (count - 1));
  const spacing = count > 1 ? positions[1] - positions[0] : 560;
  const focusSize = count > 3 ? 14 : 16;
  const focusWidth = Math.min(220, spacing - 28);
  const entries = section.data.entries.map((entry, index) => {
    const focusY = count > 3 ? 164 + (index % 2) * 28 : 164;
    const focus = wrapText(entry.focus, {
      maxWidth: focusWidth,
      maxLines: 2,
      fontSize: focusSize,
      fontWeight: 700,
      family: fonts.display,
    });

    return { entry, focus, focusY, x: positions[index] };
  });

  const contentBottom = Math.max(...entries.map(({ focus, focusY }) => focusY + (focus.lines.length - 1) * 18));
  return { entries, focusSize, height: Math.max(190 + (count > 3 ? 30 : 0), contentBottom + 10), positions };
}

function measure(section, { theme }) {
  return { height: getTimelineLayout(section, theme.fonts).height };
}

function render(section, { theme, layout, offsetY, height }) {
  const { data } = section;
  const { colors, fonts } = theme;
  const { width, gutter } = layout.canvas;
  const timeline = getTimelineLayout(section, fonts);
  const stops = timeline.entries.map(({ entry, focus, focusY, x }) => {
    const accent = colors[entry.color];
    const year = truncateText(entry.year, { maxWidth: 44, fontSize: 11, family: fonts.mono }).text;
    const focusLines = focus.lines.map((lineText, lineIndex) => text(lineText, {
      x,
      y: focusY + lineIndex * 18,
      fill: colors.primary,
      'font-family': fonts.display,
      'font-size': timeline.focusSize,
      'font-weight': 700,
      'text-anchor': 'middle',
    }));

    return group([
      rect({ x: x - 26, y: 88, width: 52, height: 22, rx: 11, fill: colors.background, stroke: colors.border }),
      text(year, { x, y: 103, fill: colors.text, 'font-family': fonts.mono, 'font-size': 11, 'text-anchor': 'middle' }),
      circle({ cx: x, cy: 132, r: 9, fill: accent }),
      circle({ cx: x, cy: 132, r: 3, fill: colors.card }),
      focusLines,
    ]);
  });

  return group([
    rect({ width, height, fill: colors.background }),
    line({ x1: gutter, y1: 0, x2: gutter, y2: height, stroke: colors.border }),
    line({ x1: width - gutter, y1: 0, x2: width - gutter, y2: height, stroke: colors.border }),
    text(truncateText(data.title, { maxWidth: 520, fontSize: 28, fontWeight: 750, family: fonts.display }).text, { x: 60, y: 46, fill: colors.primary, 'font-family': fonts.display, 'font-size': 28, 'font-weight': 750 }),
    text(truncateText(data.eyebrow, { maxWidth: 190, fontSize: 11, family: fonts.mono }).text, { x: 800, y: 44, fill: colors.text, opacity: 0.62, 'font-family': fonts.mono, 'font-size': 11, 'text-anchor': 'end' }),
    line({ x1: timeline.positions[0], y1: 132, x2: timeline.positions.at(-1), y2: 132, stroke: colors.border, 'stroke-width': 3, 'stroke-linecap': 'round' }),
    stops,
  ], { id: 'timeline', transform: `translate(0 ${offsetY})` });
}

module.exports = { measure, render };
