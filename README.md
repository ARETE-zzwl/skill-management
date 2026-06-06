# Skill Management Demo

Local-first AI agent skill manager demo for Codex and Claude Code.

This first version focuses on a practical CLI:

- scan Codex and Claude Code skill folders
- validate `SKILL.md` metadata
- import local or Git-based skills into a local registry
- detect basic name and trigger conflicts
- install skills into user or project scope
- create and apply skill profiles
- run a local Studio UI backed by the same registry and installer
- view each imported skill's `SKILL.md` instructions
- import curated open-source skills from the Studio catalog
- share one or many skills into both Codex and Claude Code targets
- distinguish imported skills from installed/callable skills

## Quick Start

```bash
npm install
npm run build
node dist/cli.js --help
```

Try the bundled examples:

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

## 中文使用

本项目现在默认提供中文 Studio UI：

- 精选库：内置 Nature 学术写作、Anthropic 官方高星 skills、Vercel 官方高星 skills、Microsoft 官方 skills、Apify 官方网页数据 skills 等来源。
- 精选库支持“下载导入”和“导入并共享安装”。导入只是进入管理库；共享安装后才会写入 Codex / Claude Code 的 skill 目录。
- 推荐开箱包：一键导入并共享安装常用的写作、前端、测试、文档、工程和数据采集 skills。
- 已导入：查看本地 registry 中的 skill，支持批量选择、批量共享安装、保存为组合、从管理库移除。
- 兼容矩阵：每个 skill 会显示 Codex / Claude Code 是否支持、是否已经安装、安装范围在哪里。
- 可调用状态：列表会显示“仅导入”“Codex 可调用”“Claude Code 可调用”或“双 agent 可调用”。
- 安全扫描：对 `scripts/`、脚本文件和 `SKILL.md` 做静态扫描，标出递归删除、网络下载、进程执行、安装依赖、敏感路径等风险信号。
- 共享：将同一个 skill 同步安装到所有声明支持的 agent，目前支持 Codex 与 Claude Code。
- 组合：把常用 skill 保存成 profile，例如 `nature-paper = nature-writing,nature-citation,nature-figure`。
- 预设组合：内置 `Nature 论文写作`、`前端开发`、`文档处理` 三个 profile 模板，可一键保存。
- 快速上手：首页提供 5 步教学，从精选库下载、查看说明、安全检查、共享安装到显式调用。
- 示例提示词：点击首页提示词按钮可复制常用调用语句，方便粘贴到 Codex 或 Claude Code。

> 说明：Codex / Claude Code 这类 agent 通常在新会话或上下文刷新时发现 skill。安装完成后，建议新开会话或刷新 agent 上下文，再用下面的显式提示调用。

显式调用示例：

```text
使用 nature-writing skill，帮我把这段 Results 改成 Nature 风格。
调用 nature-polishing，把下面的 Introduction 润色到 Nature 子刊语气。
使用 react-best-practices，审查这个 Next.js 页面性能问题。
使用 handoff，把当前进展整理成下一位 agent 可继续执行的交接说明。
```

也可以直接粘贴 GitHub tree URL：

```text
https://github.com/Yuan1z0825/nature-skills/tree/main/skills/nature-writing
```

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

Project-scope install target folders such as `.agents/` and `.claude/` are local generated data and are intentionally not committed. The repository keeps source code, tests, web assets, and example skills; project install folders can be recreated by running the CLI profile or install commands.

## Demo Scope

This is intentionally small. The registry is a JSON file at `.skillmgr/registry.json`.
The next production step is replacing it with SQLite and packaging the Studio as a Tauri desktop app.
