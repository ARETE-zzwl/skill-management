import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { importSkill } from "../src/importer.js";
import { installSkill } from "../src/installer.js";
import { Registry } from "../src/registry.js";
import { makeTempDir, writeSkill } from "./helpers.js";

describe("registry import and install flow", () => {
  it("imports a local skill into the managed cache and installs it to a target root", async () => {
    const workspace = await makeTempDir("skillmgr-flow-workspace-");
    const sourceRoot = await makeTempDir("skillmgr-flow-source-");
    const skillDir = await writeSkill(sourceRoot, "pdf", {
      name: "pdf",
      description: "Work with PDF files.",
      triggers: ["pdf"]
    });

    const imported = await importSkill(skillDir, { cwd: workspace });
    const targetRoot = path.join(workspace, "target");
    const installedPath = await installSkill(imported, {
      agent: "codex",
      scope: "project",
      cwd: workspace,
      targetRoot
    });

    expect(imported.sourcePath).toBe(path.join(workspace, ".skillmgr", "sources", "pdf"));
    expect(installedPath).toBe(path.join(targetRoot, "pdf"));
    await expect(fs.readFile(path.join(installedPath, "SKILL.md"), "utf8")).resolves.toContain("name: pdf");
  });

  it("stores and retrieves profiles", async () => {
    const workspace = await makeTempDir("skillmgr-profile-");
    const registry = new Registry(workspace);

    await registry.upsertProfile({ name: "docs", skills: ["pdf"], agent: "claude-code" });
    const profile = await registry.getProfile("docs");

    expect(profile).toEqual(expect.objectContaining({
      name: "docs",
      skills: ["pdf"],
      agent: "claude-code"
    }));
  });
});
