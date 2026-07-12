# Changelog

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
