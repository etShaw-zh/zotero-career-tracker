English | [简体中文](./doc/README-zhCN.md)

# Zotero Career Tracker

<p align="left">
  <img src="https://img.shields.io/github/license/etShaw-zh/zotero-career-tracker?color=2E75B6"  alt="License">
  <img src="https://img.shields.io/badge/Zotero-8-green?style=flat-square&logo=zotero&logoColor=CC2936" alt="zotero target version" />
  <img src="https://img.shields.io/github/stars/etShaw-zh/zotero-career-tracker" alt="Stars" />
  <img src="https://img.shields.io/github/issues/etShaw-zh/zotero-career-tracker" alt="Issues" />
  <img src="https://img.shields.io/github/issues-pr/etShaw-zh/zotero-career-tracker" alt="Pull Requests" />
  <img src="https://img.shields.io/github/downloads/etShaw-zh/zotero-career-tracker/total?logo=github&color=2E75B6" alt='download' />
  <img src="https://img.shields.io/github/downloads/etShaw-zh/zotero-career-tracker/latest/total?color=2E75B6" alt='latest' />
</p>

Research library growth tracker for Zotero. It visualizes daily added items and cumulative growth, highlights your “FOCAL” tagged items, and marks your publications for easy sharing.

## Features

- Daily added bars + cumulative line for All items and Focal items
- Publication markers (based on Zotero “My Publications”)
- Tag-based focal tracking
- One‑click image export to clipboard for sharing

## Screenshots

![Overview](./doc/overview.png)

## Installation

1. Download the latest [career-tracker.xpi](https://github.com/etShaw-zh/zotero-career-tracker/releases) from GitHub Releases.
2. In Zotero: `Tools` → `Add-ons` → gear icon → `Install Add-on From File...`
3. Select the `.xpi` and restart Zotero if required.

## Usage

1. Open `Edit` → `Preferences` → `Career Tracker`.
2. Enter focal tag names separated by semicolons (e.g. `★;⭐;🌟`).
3. Click `Refresh` to update charts.
4. Click `Share image` to copy the chart image and paste into social apps.

## Export / Share

- The share button copies a composed image to clipboard, including:
  - Title and date range
  - All/Focal charts
  - Footer note and plugin branding
- Paste directly into apps like WeChat Moments or Xiaohongshu.

## Notes

- “FOCAL” represents tagged items you consider high‑value or important.
- Publication markers use Zotero’s **My Publications** items with a `date` field.

## Acknowledgements

- Built on [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template).

## License

AGPL-3.0-or-later
