# Profile Lab

Profile Lab is a config-driven SVG profile builder for creating highly customized GitHub Profile READMEs.

It turns a YAML configuration into a deterministic SVG through validated blocks, a registry, a layout engine, and theme tokens. The project does not require a frontend framework or an external rendering service.

## Features

- YAML-based profile configuration
- Strict page and block validation
- Configurable block order and visibility
- Dynamic vertical layout
- Variant-aware block registry
- Theme token system
- Deterministic and atomic SVG generation
- Local preview with readable configuration errors
- Zero-framework Node.js CLI

## Quick Start

```bash
git clone https://github.com/Jian1202/profile-lab.git
cd profile-lab
npm ci
npm run generate:example
```

The generated example is written to `examples/jian1202/assets/profile.svg`.

## CLI

```bash
node bin/profile-lab.js generate \
  --config examples/jian1202/profile.yaml \
  --output examples/jian1202/assets/profile.svg

node bin/profile-lab.js validate \
  --config examples/jian1202/profile.yaml

node bin/profile-lab.js preview \
  --config examples/jian1202/profile.yaml \
  --output examples/jian1202/assets/profile.svg \
  --port 4173
```

Open <http://127.0.0.1:4173/> after starting the preview.

Both `--config` and `--output` accept absolute paths. Relative paths are resolved from the current working directory. Invalid configurations are fully validated before output is written, and successful writes use a temporary file followed by an atomic rename.

## Core API

```js
const { generateProfile, validateProfile } = require('./src');

const result = generateProfile({
  configPath: './profile.yaml',
  outputPath: './assets/profile.svg',
});

console.log(result.width, result.height, result.outputPath);
```

`generateProfile()` returns the parsed configuration, SVG string, resolved paths, width, height, and enabled sections. `validateProfile()` performs the same parsing, schema validation, registry lookup, and layout measurement without writing a file.

## profile.yaml

```yaml
page:
  title: Developer Profile
  subtitle: Software / Systems / Learning
  description: A profile generated with Profile Lab.

theme:
  preset: light-blue

sections:
  - id: header
    type: header
    enabled: true
    variant: default
    data:
      title: Developer Profile
      greeting: Welcome to my workspace
      subtitle: Software / Systems / Learning
```

Section order controls render order. Setting `enabled: false` removes a block and automatically moves later blocks upward. Unknown fields, duplicate IDs, unsupported block types, unsupported variants, and invalid block data are rejected with field paths.

See `examples/minimal/profile.yaml` for a neutral starting point and `examples/jian1202/profile.yaml` for a complete example.

## Blocks and Variants

| Block | Variant | Purpose |
| --- | --- | --- |
| `header` | `default` | Profile identity and subtitle |
| `mission` | `cards` | Current focus tracks |
| `timeline` | `horizontal` | Developer journey |
| `radar` | `default` | Static profile metrics |
| `skills` | `tree` | Knowledge groups |
| `projects` | `drawer` | Project entries and tags |
| `footer` | `default` | Handle and closing line |

The registry is variant-aware, but only the implemented designs above are registered. Profile Lab does not include placeholder variants.

## Themes

The current preset is `light-blue`. Themes live in `src/themes/` and contain only reusable colors and typography tokens. To add a theme, create a token module and register it in `src/themes/index.js`; blocks must continue consuming colors through the theme context.

## Architecture

```text
profile.yaml
  -> config loader and schemas
  -> block registry
  -> measure(section, context)
  -> dynamic layout
  -> render(section, context)
  -> SVG DSL
  -> profile.svg
```

```text
bin/                 CLI entrypoint
src/config/          YAML loading and validation
src/registry/        Type and variant dispatch
src/renderer/        Dynamic layout and root SVG rendering
src/layout/          Shared layout defaults
src/themes/          Theme presets
src/blocks/          Block implementations
src/preview/         Local preview server
src/utils/           SVG DSL
examples/            Complete and minimal configurations
tests/               Config, CLI, generation, and preview tests
```

## Development

```bash
npm test
npm run validate:example
npm run generate:example
npm run preview:example
```

## Current Limitations

- One built-in theme preset
- One implemented variant per block type
- Static data only
- No browser-based visual editor
- No GitHub API integration
- Not published as an npm package

## Roadmap

- Schema-driven local visual editor
- Additional intentional themes and block variants
- Optional dynamic data merge layer
- Reusable GitHub Action integration

## License

[MIT](LICENSE)
