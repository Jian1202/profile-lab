# Profile Lab

Profile Lab 是一个配置驱动的 SVG 个人主页生成器，用来创建高度自定义的 GitHub Profile README。

它会将 YAML 配置经过数据校验、区块注册、布局计算和主题渲染，稳定地生成一张完整 SVG。项目不依赖前端框架，也不需要外部渲染服务。

## 功能特点

- 使用 YAML 配置个人主页
- 严格校验页面和区块数据
- 自由调整区块顺序和显示状态
- 根据内容自动计算纵向布局
- 支持按区块类型和变体注册组件
- 统一的主题 token 系统
- 可重复、原子化的 SVG 生成流程
- 本地预览，并显示清晰的配置错误
- 无框架依赖的 Node.js CLI

## 快速开始

```bash
git clone https://github.com/Jian1202/profile-lab.git
cd profile-lab
npm ci
npm run generate:example
```

生成的示例文件位于 `examples/jian1202/assets/profile.svg`。

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
```

启动预览后访问 <http://127.0.0.1:4173/>。

`--config` 和 `--output` 都支持绝对路径。相对路径会以当前工作目录为基准解析。程序会在写入文件前完成全部配置校验；校验通过后，先写入临时文件，再以原子重命名的方式更新目标文件。

## 核心 API

```js
const { generateProfile, validateProfile } = require('./src');

const result = generateProfile({
  configPath: './profile.yaml',
  outputPath: './assets/profile.svg',
});

console.log(result.width, result.height, result.outputPath);
```

`generateProfile()` 返回解析后的配置、SVG 字符串、已解析路径、画布宽高和启用的区块。`validateProfile()` 会执行相同的配置解析、Schema 校验、注册表查找和布局测量，但不会写入文件。

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
bin/                 CLI 入口
src/config/          YAML 加载与配置校验
src/registry/        区块类型和变体分发
src/renderer/        动态布局与根 SVG 渲染
src/layout/          通用布局配置
src/themes/          主题预设
src/blocks/          区块实现
src/text/            确定性文本测量、截断与换行
src/preview/         本地预览服务
src/utils/           SVG DSL
examples/            完整配置和最小配置示例
tests/               配置、CLI、生成与预览测试
```

## 开发与验证

```bash
npm test
npm run validate:example
npm run generate:example
npm run preview:example
```

## 当前限制

- 目前只有一个内置主题
- 每种区块类型目前只有一个已实现变体
- 仅支持静态数据
- 区块采用有限容量布局
- 暂无浏览器可视化编辑器
- 暂未接入 GitHub API
- 尚未发布为 npm 包

## 后续方向

- 基于 Schema 的本地可视化编辑器
- 更多风格明确的主题和区块变体
- 可选的动态数据合并层
- 可复用的 GitHub Actions 集成方式

## 开源协议

[MIT](LICENSE)
