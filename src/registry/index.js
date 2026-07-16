const header = require('../blocks/header');
const mission = require('../blocks/mission');
const timeline = require('../blocks/timeline');
const radar = require('../blocks/radar');
const skills = require('../blocks/skills');
const projects = require('../blocks/projects');
const footer = require('../blocks/footer');
const validators = require('../config/block-schema');
const { editorDefinitions } = require('../editor/definitions');

function createBlock({ variants, validate, editor }) {
  return {
    editor,
    variants,
    validate(section, path) {
      validate(section.data, `${path}.data`);
    },
    measure(section, context) {
      return variants[section.variant].measure(section, context);
    },
    render(section, context) {
      return variants[section.variant].render(section, context);
    },
  };
}

const registry = {
  header: createBlock({
    variants: { default: header },
    validate: validators.header,
    editor: editorDefinitions.header,
  }),
  mission: createBlock({
    variants: { cards: mission },
    validate: validators.mission,
    editor: editorDefinitions.mission,
  }),
  timeline: createBlock({
    variants: { horizontal: timeline },
    validate: validators.timeline,
    editor: editorDefinitions.timeline,
  }),
  radar: createBlock({
    variants: { default: radar },
    validate: validators.radar,
    editor: editorDefinitions.radar,
  }),
  skills: createBlock({
    variants: { tree: skills },
    validate: validators.skills,
    editor: editorDefinitions.skills,
  }),
  projects: createBlock({
    variants: { drawer: projects },
    validate: validators.projects,
    editor: editorDefinitions.projects,
  }),
  footer: createBlock({
    variants: { default: footer },
    validate: validators.footer,
    editor: editorDefinitions.footer,
  }),
};

function getBlock(section) {
  const block = registry[section.type];

  if (!block) {
    throw new Error(`未知区块 type：${section.type}`);
  }

  if (!block.variants[section.variant]) {
    throw new Error(`区块 ${section.id} 不支持 variant：${section.variant}`);
  }

  return block;
}

module.exports = { getBlock, registry };
