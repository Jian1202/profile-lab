function escapeText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', '&quot;');
}

function renderAttributes(attributes = {}) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(' ');
}

function normalizeChildren(children) {
  return (Array.isArray(children) ? children : [children]).flat(Infinity).filter(Boolean);
}

function indent(value) {
  return value.split('\n').map((line) => `  ${line}`).join('\n');
}

function element(name, attributes = {}, children = []) {
  const attrs = renderAttributes(attributes);
  const opening = attrs ? `<${name} ${attrs}` : `<${name}`;
  const content = normalizeChildren(children);

  if (!content.length) {
    return `${opening}/>`;
  }

  if (['text', 'title', 'desc'].includes(name)) {
    return `${opening}>${content.join('')}</${name}>`;
  }

  return `${opening}>\n${content.map(indent).join('\n')}\n</${name}>`;
}

function text(content, attributes = {}) {
  return element('text', attributes, escapeText(content));
}

function title(content, attributes = {}) {
  return element('title', attributes, escapeText(content));
}

function description(content, attributes = {}) {
  return element('desc', attributes, escapeText(content));
}

function rect(attributes = {}) {
  return element('rect', attributes);
}

function line(attributes = {}) {
  return element('line', attributes);
}

function circle(attributes = {}) {
  return element('circle', attributes);
}

function path(attributes = {}) {
  return element('path', attributes);
}

function group(children, attributes = {}) {
  return element('g', attributes, children);
}

function svgDocument({ width, height, title: documentTitle, description: documentDescription, children }) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    element('svg', {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
      role: 'img',
      'aria-labelledby': 'title desc',
    }, [
      title(documentTitle, { id: 'title' }),
      description(documentDescription, { id: 'desc' }),
      children,
    ]),
    '',
  ].join('\n');
}

module.exports = { circle, description, element, group, line, path, rect, svgDocument, text, title };
