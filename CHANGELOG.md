# Changelog

## 0.2.0-alpha.2

### Added

- Local visual editor V1
- Manifest-driven Vue forms
- Live validation and SVG preview
- Atomic YAML and SVG saving
- Single-level rollback
- Local editor CLI and API
- External configuration path support

### Compatibility

- Profile schema unchanged
- Editor Manifest contract remains version 1
- Existing CLI commands remain compatible
- Existing SVG outputs remain unchanged
- Personal profile remains pinned to v0.1.2

## 0.2.0-alpha.1

### Added

- Versioned machine-readable Editor Manifest
- Page, theme, section and block field metadata
- Registry and variant compatibility checks
- Shared accent option definitions
- `getEditorManifest()` read-only API
- `profile-lab manifest` CLI command
- Manifest determinism and contract tests

### Compatibility

- Profile YAML format is unchanged
- Rendering behavior is unchanged
- Existing CLI commands remain compatible
- Bundled and regression SVG outputs remain unchanged
- Visual editor and write APIs are not included yet

## 0.1.2

### Fixed

- Mission items now use available card width before truncation
- Skills remain single-column while vertical space is sufficient
- Project tags can use remaining vertical space for a second line
- Current Jian1202 profile added as a layout regression fixture

### Compatibility

- Existing bundled Jian1202 example remains byte-identical
- Non-target sections of the current Jian1202 profile remain byte-identical
- Configuration format and validation limits are unchanged

## 0.1.1

### Added

- 确定性的文本宽度估算工具
- Unicode 安全的单行截断和有限行换行
- 区块内容容量与字段长度校验
- Unicode、Emoji 和 XML 转义测试
- 文本溢出、CLI、Preview 与字节兼容性测试

### Fixed

- 个人主页区块中潜在的文本溢出
- Timeline 长文本与相邻节点重叠风险
- Projects 描述和标签超出卡片风险
- 无效语言占比分布仍可通过校验的问题
- SVG 用户文本未完整转义引号和单引号的问题
