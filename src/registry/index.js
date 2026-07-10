const header = require('../blocks/header');
const mission = require('../blocks/mission');
const timeline = require('../blocks/timeline');
const radar = require('../blocks/radar');
const skills = require('../blocks/skills');
const projects = require('../blocks/projects');
const footer = require('../blocks/footer');
const validators = require('../config/block-schema');

function createBlock(variants, validate) {
  return {
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
  header: createBlock({ default: header }, validators.header),
  mission: createBlock({ cards: mission }, validators.mission),
  timeline: createBlock({ horizontal: timeline }, validators.timeline),
  radar: createBlock({ default: radar }, validators.radar),
  skills: createBlock({ tree: skills }, validators.skills),
  projects: createBlock({ drawer: projects }, validators.projects),
  footer: createBlock({ default: footer }, validators.footer),
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
