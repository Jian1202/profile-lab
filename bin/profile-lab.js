#!/usr/bin/env node

const { generateProfile, getEditorManifest, validateProfile } = require('../src');
const { startPreview } = require('../src/preview/server');

const help = `Profile Lab — A config-driven SVG profile builder.

Usage:
  profile-lab generate --config <path> --output <path>
  profile-lab validate --config <path>
  profile-lab preview --config <path> --output <path> [--port 4173]
  profile-lab manifest
  profile-lab --help

Relative paths are resolved from the current working directory.`;

function parseOptions(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];

    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      throw new Error(`参数 ${flag || '(empty)'} 缺少值。`);
    }

    const name = flag.slice(2);
    if (!['config', 'output', 'port'].includes(name)) {
      throw new Error(`未知参数：${flag}`);
    }
    options[name] = value;
  }

  return options;
}

function requireOption(options, name, command) {
  if (!options[name]) {
    throw new Error(`${command} 命令需要 --${name} <path>。`);
  }
}

function run(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;

  if (!command || command === '--help' || command === '-h' || args.includes('--help')) {
    console.log(help);
    return;
  }

  if (command === 'manifest') {
    if (args.length) {
      throw new Error('manifest 命令不接受参数。');
    }
    process.stdout.write(`${JSON.stringify(getEditorManifest(), null, 2)}\n`);
    return;
  }

  const options = parseOptions(args);
  requireOption(options, 'config', command);

  if (command === 'generate') {
    requireOption(options, 'output', command);
    const result = generateProfile({ configPath: options.config, outputPath: options.output });
    console.log(`Generated ${result.outputPath} (${result.width}x${result.height})`);
    return;
  }

  if (command === 'validate') {
    if (options.output || options.port) {
      throw new Error('validate 命令只接受 --config。');
    }
    const result = validateProfile({ configPath: options.config });
    console.log(`Valid profile config: ${result.enabledSections.length} blocks, ${result.width}x${result.height}`);
    return;
  }

  if (command === 'preview') {
    requireOption(options, 'output', command);
    const port = options.port === undefined ? 4173 : Number(options.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('--port 必须是 1 到 65535 的整数。');
    }
    startPreview({ configPath: options.config, outputPath: options.output, port });
    return;
  }

  throw new Error(`未知命令：${command}`);
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { help, parseOptions, run };
