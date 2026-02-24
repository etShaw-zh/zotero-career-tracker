[English](./../README.md) | 简体中文

# Zotero 科研轨迹追踪

<p align="left">
  <img src="https://img.shields.io/github/license/etShaw-zh/zotero-career-tracker?color=2E75B6"  alt="License">
  <img src="https://img.shields.io/badge/Zotero-8-green?style=flat-square&logo=zotero&logoColor=CC2936" alt="zotero target version" />
  <img src="https://img.shields.io/github/stars/etShaw-zh/zotero-career-tracker" alt="Stars" />
  <img src="https://img.shields.io/github/issues/etShaw-zh/zotero-career-tracker" alt="Issues" />
  <img src="https://img.shields.io/github/issues-pr/etShaw-zh/zotero-career-tracker" alt="Pull Requests" />
  <img src="https://img.shields.io/github/downloads/etShaw-zh/zotero-career-tracker/total?logo=github&color=2E75B6" alt='download' />
  <img src="https://img.shields.io/github/downloads/etShaw-zh/zotero-career-tracker/latest/total?color=2E75B6" alt='latest' />
</p>

用于可视化 Zotero 文献库增长与科研轨迹的插件。它展示每日新增与累计曲线，支持关注标签（FOCAL）统计，并标记“我的发表”以便分享。

## 功能亮点
- 全部条目 / 关注条目双图展示（柱形 + 累计折线）
- “我的发表”时间点标记
- 标签驱动的 FOCAL 统计
- 一键复制分享图片（便于发小红书、朋友圈）

## 截图
![Overview](./overview.png)

## 安装
1. 从 GitHub Releases 下载最新的 `.xpi`
2. Zotero → `工具` → `插件` → 齿轮 → `Install Add-on From File...`
3. 选择 `.xpi` 并按提示重启

## 使用
1. 打开 Zotero → `编辑` → `首选项` → `科研轨迹追踪`
2. 在输入框中用分号分隔标签（例如：`★;⭐;🌟`）
3. 点击 `刷新` 更新统计
4. 点击 `点击分享` 复制分享图片并粘贴到社交平台

## 导出 / 分享
- 分享按钮会将合成图片复制到剪贴板：
  - 标题与时间范围
  - 全部/关注两张图
  - 底部说明与插件信息
- 适合直接粘贴到朋友圈、小红书等平台

## 说明
- FOCAL 表示你用标签标记的高价值条目
- “我的发表”标记基于 Zotero 的 **My Publications** 并使用 `date` 字段

## 致谢
- 基于 [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template)

## 许可
AGPL-3.0-or-later
