# Skill Management Demo

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Local-first AI agent skill manager demo for Codex and Claude Code.

This project provides a practical CLI and local Studio UI for managing agent skills without a hosted backend. It can scan skill folders, validate `SKILL.md` metadata, import local or Git-based skills, install skills into Codex and Claude Code targets, and manage reusable skill profiles.

## Features

- scan Codex and Claude Code skill folders
- validate Agent Skills metadata in `SKILL.md`
- import local folders or GitHub tree URLs into a local registry
- detect basic name and trigger conflicts
- install skills into user or project scope
- create and apply skill profiles
- run a local Studio UI backed by the same registry and installer
- view each imported skill's instructions
- import curated open-source skills from the Studio catalog
- distinguish imported skills from installed/callable skills

## Quick Start

```bash
npm install
npm run build
node dist/cli.js --help
```

Try the bundled example skill:

```bash
node dist/cli.js validate examples/skills/pdf
node dist/cli.js import examples/skills/pdf
node dist/cli.js scan --registry
node dist/cli.js conflicts
node dist/cli.js profile create docs --skills pdf
node dist/cli.js profile apply docs --agent codex --scope project
```

Run the local Studio UI:

```bash
npm run studio
```

Then open `http://localhost:4317`.

## Commands

| Command | Description |
| --- | --- |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm test` | Run the Vitest test suite. |
| `npm run build` | Compile TypeScript into `dist/`. |
| `npm run studio` | Start the local Studio UI server. |
| `npm run dev` | Run the CLI source entry with `tsx`. |

## Supported Skill Layout

The demo expects the Agent Skills shape:

```text
skill-name/
  SKILL.md
  scripts/
  references/
  assets/
```

`SKILL.md` must contain YAML frontmatter with at least:

```yaml
---
name: pdf
description: Work with PDF files.
---
```

Optional fields recognized by this demo:

```yaml
version: 0.1.0
tags: [documents, pdf]
triggers: [pdf, ocr]
agents: [codex, claude-code]
```

## Agent Targets

Default installation paths:

- Codex user scope: `~/.agents/skills`
- Codex project scope: `.agents/skills`
- Claude Code user scope: `~/.claude/skills`
- Claude Code project scope: `.claude/skills`

Use `--target-root` when you want to install into a sandbox folder while testing.

## Repository Data

Project-scope install target folders such as `.agents/` and `.claude/` are local generated data and are intentionally not committed. The local registry and source cache live under `.skillmgr/`, which is also ignored.

The repository keeps source code, tests, web assets, and example skills. Project install folders can be recreated by running the CLI profile or install commands.

## Security Notes

Imported skills may include scripts, references, and assets from third-party repositories. Review upstream licenses before redistributing imported skills, and review security scan warnings before installing or sharing a skill.

For sensitive security reports, see [SECURITY.md](SECURITY.md).

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before contributing.

## 中文说明

这是一个本地优先的 AI Agent 技能管理 demo，面向 Codex 和 Claude Code。当前版本提供 CLI 和本地 Studio UI，用来扫描、导入、校验、安装和组合 Agent Skills。

本仓库不会提交 `.agents/`、`.claude/`、`.skillmgr/` 这些本地生成数据目录；公开仓库只保留源码、测试、网页资源和示例 skill。

如果从精选库或 GitHub URL 导入第三方 skill，请在安装和分享前检查上游许可证与安全扫描结果。

## License

This project is licensed under the [MIT License](LICENSE).
