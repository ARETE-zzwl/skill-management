# Skill Management

[中文](#中文) · [English](#english)

## 中文

用于管理 Codex 和 Claude Code skills 的本地工具，提供命令行和浏览器界面。

它把 skills 的导入、检查和安装分开处理：先导入本地目录或 GitHub 仓库，检查元数据和名称冲突，再安装到指定工具的用户目录或项目目录。常用的一组 skills 可以保存成 profile，之后一起安装。

目前是 demo，注册表和源码缓存都保存在本地，不需要部署服务端。

### 开始使用

需要 Node.js 20 或更新版本；从 GitHub 导入时还需要 Git。

```bash
git clone https://github.com/ARETE-zzwl/skill-management.git
cd skill-management
npm install
npm run build
node dist/cli.js --help
```

试一下仓库里的示例：

```bash
node dist/cli.js validate examples/skills/pdf
node dist/cli.js import examples/skills/pdf
node dist/cli.js scan --registry
node dist/cli.js conflicts
node dist/cli.js profile create docs --skills pdf
node dist/cli.js profile apply docs --agent codex --scope project
```

最后一步会安装到当前项目的 `.agents/skills` 目录。仅导入注册表还不等于已安装。

启动浏览器界面：

```bash
npm run studio
```

打开 [localhost:4317](http://localhost:4317)。界面和命令行使用同一份本地注册表。

### Skill 格式

```text
skill-name/
  SKILL.md
  scripts/
  references/
  assets/
```

`SKILL.md` 至少需要包含以下 YAML 元数据；其他目录按需添加：

```yaml
---
name: pdf
description: Work with PDF files.
---
```

工具也识别 `version`、`tags`、`triggers` 和 `agents` 字段。

### 安装位置和本地文件

| 工具 | 用户目录 | 项目目录 |
| --- | --- | --- |
| Codex | `~/.agents/skills` | `.agents/skills` |
| Claude Code | `~/.claude/skills` | `.claude/skills` |

可用 `--target-root` 指定其他安装目录。注册表和源码缓存位于当前工作目录的 `.skillmgr/`。这些目录不提交到仓库。

导入第三方 skill 前，先查看它的脚本和许可证。工具提供基础冲突检查和安全扫描，具体行为仍需要读源文件确认。

### 开发

```bash
npm run typecheck
npm test
npm run build
```

贡献说明见 [CONTRIBUTING.md](CONTRIBUTING.md)，安全问题见 [SECURITY.md](SECURITY.md)。

## English

A local tool for managing Codex and Claude Code skills, with a CLI and a browser UI.

Import a local folder or GitHub repository, check its metadata and name conflicts, then install it into a user or project directory. Profiles let you save and install a group of skills together. This is a demo; the registry and source cache stay on your machine.

### Get started

Use Node.js 20 or later. Git is also needed for GitHub imports.

```bash
git clone https://github.com/ARETE-zzwl/skill-management.git
cd skill-management
npm install
npm run build
node dist/cli.js --help
```

The example above validates and imports the bundled PDF skill, checks conflicts, then installs the `docs` profile into the current project's `.agents/skills` directory. Importing a skill into the registry does not install it.

Run `npm run studio` and open [localhost:4317](http://localhost:4317) for the browser UI. It uses the same registry as the CLI.

### Files and installation targets

A skill needs a `SKILL.md` file with YAML frontmatter containing `name` and `description`. Optional fields include `version`, `tags`, `triggers` and `agents`; scripts, references and assets can live alongside it.

Default targets are `~/.agents/skills` or `.agents/skills` for Codex, and `~/.claude/skills` or `.claude/skills` for Claude Code. Use `--target-root` to override the target. The registry and source cache live in `.skillmgr/` under the current working directory. Generated directories are ignored by Git.

Read third-party scripts and licenses before installation or redistribution. Conflict checks and security scans are basic checks, so review the source as well.

### Development

Run `npm run typecheck`, `npm test` and `npm run build`. See [CONTRIBUTING.md](CONTRIBUTING.md) for contributions and [SECURITY.md](SECURITY.md) for security reports.

## License

[MIT](LICENSE).
