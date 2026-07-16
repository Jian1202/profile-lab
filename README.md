# Profile Lab

Profile Lab 是一个配置驱动的 SVG 个人主页生成器，用来创建高度自定义的 GitHub Profile README。

它会将 YAML 配置经过数据校验、区块注册、布局计算和主题渲染，稳定地生成一张完整 SVG。生成器仍是轻量的 Node.js 工具；仓库同时提供基于 Vue 的本地可视化编辑器，不需要外部渲染服务。

## 功能特点

- 使用 YAML 配置个人主页
- 严格校验页面和区块数据
- 自由调整区块顺序和显示状态
- 根据内容自动计算纵向布局
- 支持按区块类型和变体注册组件
- 统一的主题 token 系统
- 可重复、原子化的 SVG 生成流程
- 本地预览，并显示清晰的配置错误
- 提供版本化、机器可读的 Editor Manifest
- 可编辑、实时校验、实时预览的本地可视化编辑器
- YAML 与 SVG 双文件事务保存和单级回滚
- 轻量的 Node.js CLI

## 快速开始

```bash
git clone https://github.com/Jian1202/profile-lab.git
cd profile-lab
npm ci
npm run generate:example
```

生成的示例文件位于 `examples/jian1202/assets/profile.svg`。

启动可视化编辑器：

```bash
npm run editor:example
```

浏览器访问 <http://127.0.0.1:4173/>。详细用法见 [本地可视化编辑器](docs/editor.md)。

## 命令行使用

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

node bin/profile-lab.js editor \
  --config examples/jian1202/profile.yaml \
  --output examples/jian1202/assets/profile.svg \
  --port 4173

node bin/profile-lab.js manifest
```

`preview` 提供只读 SVG 页面；`editor` 提供 Manifest 驱动的配置编辑、实时校验、实时预览、保存和回滚。两者都只监听 `127.0.0.1`。

`--config` 和 `--output` 都支持绝对路径。相对路径会以当前工作目录为基准解析。编辑器保存时会重新格式化 YAML，原有注释可能丢失；配置与 SVG 会在同一事务中更新，任一步失败都会恢复保存前的两个文件。

## 核心 API

```js
const { generateProfile, getEditorManifest, validateProfile } = require('./src');

const result = generateProfile({
  configPath: './profile.yaml',
  outputPath: './assets/profile.svg',
});

console.log(result.width, result.height, result.outputPath);

const manifest = getEditorManifest();
console.log(manifest.contract, manifest.blocks);
```

`generateProfile()` 返回解析后的配置、SVG 字符串、已解析路径、画布宽高和启用的区块。`validateProfile()` 会执行相同的配置解析、Schema 校验、注册表查找和布局测量，但不会写入文件。

## Editor Manifest

Editor Manifest 是本地编辑器使用的只读数据契约，描述页面、主题、区块、变体、编辑控件、容量限制和跨字段提示规则。Vue 表单直接读取这份契约，七个区块不维护各自独立的手写表单。

通过 Node API 获取：

```js
const { getEditorManifest } = require('./src');

const manifest = getEditorManifest();
console.log(manifest.contract.name); // profile-lab/editor-manifest
console.log(manifest.contract.version); // 1
```

通过 CLI 输出格式化 JSON：

```bash
node bin/profile-lab.js manifest
```

Manifest 不替代现有配置校验。编辑器用它构建控件和即时提示，但实时预览与保存仍会经过现有 Validator、Registry 和 Renderer。

稳定标识包括 `contract.name`、`contract.version`、block `type`、variant `value`、field `path` 和 field `control`。删除或重命名这些标识、改变字段类型或 control 语义、改变 object-list item 结构或顶层结构，都属于破坏性变更；新增 block、variant、option、帮助文案或可选描述 metadata 通常是兼容扩展。

消费者必须只接受自己支持的 `contract.version`，对更高且未知的主版本明确拒绝，并容忍同一主版本中的未知附加字段。Manifest 契约版本独立于 package 版本，也不会写入 `profile.yaml`。

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

`sections` 的排列顺序就是最终渲染顺序。将 `enabled` 设为 `false` 会移除对应区块，后续区块会自动向上补位。未知字段、重复 ID、不支持的区块类型或变体，以及不符合要求的区块数据，都会在报错中标明对应字段路径。

可以从 `examples/minimal/profile.yaml` 的中性模板开始，也可以参考 `examples/jian1202/profile.yaml` 中的完整示例。

## 区块与变体

| 区块 | 变体 | 用途 |
| --- | --- | --- |
| `header` | `default` | 个人标识与副标题 |
| `mission` | `cards` | 当前关注的方向 |
| `timeline` | `horizontal` | 成长与探索路径 |
| `radar` | `default` | 静态主页指标 |
| `skills` | `tree` | 知识与技能分组 |
| `projects` | `drawer` | 项目条目与标签 |
| `footer` | `default` | 主页标识与收尾文字 |

注册系统支持同一区块的多个变体，但目前只注册了表格中已经实现的设计，项目中不包含仅作占位的变体。

## 内容与布局限制

Profile Lab 会在生成前校验区块容量和字段长度。超过设计容量的配置会返回带完整字段路径的错误；合法但较长的文本会根据字段用途进行单行截断或有限行换行，以避免内容超出画布和卡片边界。

布局会优先利用区块内已有空间，能完整显示时保持原布局，空间不足时优先换行，最后才截断文本。

| 区块 | 主要限制 |
| --- | --- |
| Header | 标题、问候语和副标题均有长度限制，超宽时单行截断 |
| Mission | 1–2 组方向，每组 1–6 个条目 |
| Timeline | 2–5 个节点，长 focus 最多显示两行 |
| Radar | 最多 4 个统计项、5 个语言项，语言占比总和必须为 100 |
| Skills | 1–2 棵知识树，每棵最多 6 个条目 |
| Projects | 最多 3 个项目，每个项目最多 4 个标签，描述最多显示两行 |
| Footer | Handle 和 Slogan 均会按各自可用宽度截断 |

这些限制用于保证 SVG 输出稳定，不会把现有区块扩展成无限列表或浏览器式自由布局。具体字段限制以 `src/config/limits.js` 为准。

## 主题

目前内置 `light-blue` 主题。主题文件位于 `src/themes/`，只保存可复用的颜色与字体 token。新增主题时，需要创建一个 token 模块并在 `src/themes/index.js` 中注册；所有区块仍应通过主题上下文读取颜色。

## 架构

```text
profile.yaml
  -> 配置加载与 Schema 校验
  -> 区块注册表
  -> measure(section, context)
  -> 动态布局
  -> render(section, context)
  -> SVG DSL
  -> profile.svg
```

```text
Editor Manifest + profile.yaml
  -> Vue 动态表单
  -> 本地 Editor API
  -> Validator + Renderer
  -> 实时 SVG 预览
  -> YAML / SVG 双文件事务保存
```

```text
bin/                 CLI 入口
editor/              Vue 可视化编辑器源码与 Vite 配置
src/config/          YAML 加载与配置校验
src/editor/          Manifest、Editor API、HTTP 服务、序列化与保存事务
src/registry/        区块类型和变体分发
src/renderer/        动态布局与根 SVG 渲染
src/layout/          通用布局配置
src/themes/          主题预设
src/blocks/          区块实现
src/text/            确定性文本测量、截断与换行
src/preview/         本地预览服务
src/utils/           SVG DSL 与通用文件工具
examples/            完整配置和最小配置示例
tests/               配置、CLI、生成、Editor API、事务与前端纯函数测试
```

## 开发与验证

```bash
npm test
npm run editor:build
npm run editor:example
npm run validate:example
npm run generate:example
npm run manifest
npm run preview:example
```

## 当前限制

- 目前只有一个内置主题
- 每种区块类型目前只有一个已实现变体
- 仅支持静态数据
- 区块采用有限容量布局
- 编辑器暂不支持新增或删除 Section
- 编辑器暂不支持修改 Section type、variant 或自由拖拽画布
- 编辑器仅保存单级、当前进程内的回滚记录
- YAML 保存不会保留原注释
- 暂未接入 GitHub API
- 尚未发布为 npm 包

## 后续方向

- 更完整的编辑器结构操作与可选配置迁移
- 更多风格明确的主题和区块变体
- 可选的动态数据合并层
- 可复用的 GitHub Actions 集成方式

## 开源协议

[MIT](LICENSE)
