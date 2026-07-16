# 本地可视化编辑器

Profile Lab Editor 是随仓库运行的本地工具。它读取指定的 `profile.yaml`，通过 Editor Manifest 生成表单，并使用现有 Validator 和 Renderer 实时生成 SVG。

## 安装

需要 Node.js 20 或更高版本。

```bash
git clone https://github.com/Jian1202/profile-lab.git
cd profile-lab
npm ci
```

## 启动完整示例

```bash
npm run editor:example
```

命令会先构建 Vue 编辑器，再使用 `examples/jian1202/profile.yaml` 启动本地服务。浏览器访问：

<http://127.0.0.1:4173/>

## 编辑外部配置

先构建编辑器：

```bash
npm run editor:build
```

PowerShell：

```powershell
node .\bin\profile-lab.js editor `
  --config C:\path\to\profile.yaml `
  --output C:\path\to\assets\profile.svg `
  --port 4173
```

macOS、Linux 或 Git Bash：

```bash
node ./bin/profile-lab.js editor \
  --config /path/to/profile.yaml \
  --output /path/to/assets/profile.svg \
  --port 4173
```

`--config` 与 `--output` 必填，`--port` 默认为 `4173`。相对路径以当前工作目录为准。服务只监听 `127.0.0.1`，不会对局域网开放。

## 可用功能

- 编辑页面信息、主题和现有 Section 内容
- 使用 `text`、`textarea`、`number`、`toggle`、`select`、`string-list`、`object-list` 七类通用控件
- 启用或关闭 Section，并使用按钮调整顺序
- 编辑 Section ID，实时检查重复 ID
- 200–300 ms 防抖校验与 SVG 预览
- 在配置无效时保留最后一次有效预览
- 保存 YAML 并同时更新 SVG
- 回滚最近一次成功保存前的两个文件
- 放弃未保存修改并重新读取磁盘配置

Section 的 `type` 与 `variant` 在 V1 中只读，避免生成与其 data 不匹配的不完整配置。

## 保存行为

保存前会依次完成配置校验、SVG 内存渲染和稳定 YAML 序列化。确认两份内容都有效后，编辑器才会使用同目录临时文件更新 `profile.yaml` 与 `profile.svg`。

如果任一步失败，两个文件都会恢复为保存前的原字节。回滚记录只有一级，并且只保存在当前服务进程内；重启编辑器后不会保留。

保存会按照固定字段顺序重新格式化 YAML。V1 不保留 YAML 注释，原有注释可能在保存后丢失。

## 安全边界

- HTTP 服务仅绑定 `127.0.0.1`
- API 只能读写启动命令指定的配置和输出路径
- 请求不能提供或覆盖文件路径
- JSON 请求体上限为 1 MB
- 静态文件只从固定的 `editor/dist` 目录提供
- 不设置通配 CORS
- SVG 使用 Blob URL 放入 `img`，不会注入页面 DOM
- 不执行配置中的代码，也不读取其他任意文件

## V1 限制

- 不能新增或删除 Section
- 不能修改 Section type 或 variant
- 不支持 object-list 嵌套 object-list
- 不提供拖拽排序或 SVG 坐标编辑
- 不保留 YAML 注释
- 不接入 GitHub API、账号、云服务或多人协作
- 目前只有 `light-blue` 主题和现有七个区块
