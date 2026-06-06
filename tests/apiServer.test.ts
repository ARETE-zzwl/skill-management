import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  deleteSkillAction,
  getAppState,
  importSkillAction,
  installSharedSkillAction,
  installSharedSkillsAction,
  installSkillAction,
  saveProfileAction
} from "../src/api.js";
import { createStudioServer, startStudioServer } from "../src/server.js";
import { makeTempDir, writeSkill } from "./helpers.js";

const servers: ReturnType<typeof createStudioServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  servers.length = 0;
});

describe("api actions", () => {
  it("imports skills and returns an app state summary", async () => {
    const workspace = await makeTempDir("skillmgr-api-workspace-");
    const sourceRoot = await makeTempDir("skillmgr-api-source-");
    const summarySkill = await writeSkill(sourceRoot, "summary-only-skill", {
      name: "summary-only-skill",
      description: "Work with PDF files.",
      tags: ["documents"],
      triggers: ["pdf"]
    });

    await importSkillAction({ source: summarySkill }, workspace);
    const state = await getAppState(workspace);

    expect(state.registrySkills).toHaveLength(1);
    expect(state.conflicts).toEqual([]);
    expect(state.agentRoots).toHaveLength(4);
    expect(state.catalog.length).toBeGreaterThan(0);
    expect(state.profileTemplates.map((template) => template.id)).toContain("nature-paper");
    expect(state.skillInsights[0].compatibility).toHaveLength(2);
    expect(state.skillInsights[0].invocationExamples.length).toBeGreaterThan(0);
    expect(state.skillInsights[0].callableAgents).toEqual([]);
  });

  it("rejects installing a skill into an unsupported agent", async () => {
    const workspace = await makeTempDir("skillmgr-api-workspace-");
    const sourceRoot = await makeTempDir("skillmgr-api-source-");
    const skillDir = await writeSkill(sourceRoot, "codex-only", {
      name: "codex-only",
      description: "Codex-only skill.",
      agents: ["codex"]
    });

    await importSkillAction({ source: skillDir }, workspace);

    await expect(installSkillAction({
      skill: "codex-only",
      agent: "claude-code",
      scope: "project",
      targetRoot: path.join(workspace, "target")
    }, workspace)).rejects.toThrow("does not declare support");
  });

  it("installs a shared skill into both supported agent targets", async () => {
    const workspace = await makeTempDir("skillmgr-shared-workspace-");
    const sourceRoot = await makeTempDir("skillmgr-shared-source-");
    const skillDir = await writeSkill(sourceRoot, "shared", {
      name: "shared",
      description: "Shared skill."
    });

    await importSkillAction({ source: skillDir }, workspace);
    const installed = await installSharedSkillAction({
      skill: "shared",
      scope: "project",
      targetRoot: path.join(workspace, "shared-target")
    }, workspace);

    expect(installed.map((item) => item.agent).sort()).toEqual(["claude-code", "codex"]);
    await expect(fs.readFile(path.join(workspace, "shared-target", "codex", "shared", "SKILL.md"), "utf8")).resolves.toContain("name: shared");
    await expect(fs.readFile(path.join(workspace, "shared-target", "claude-code", "shared", "SKILL.md"), "utf8")).resolves.toContain("name: shared");
  });

  it("marks installed skills callable in app state", async () => {
    const workspace = await makeTempDir("skillmgr-callable-workspace-");
    const sourceRoot = await makeTempDir("skillmgr-callable-source-");
    const skillDir = await writeSkill(sourceRoot, "callable", {
      name: "callable",
      description: "Callable skill."
    });

    await importSkillAction({ source: skillDir }, workspace);
    await installSkillAction({
      skill: "callable",
      agent: "codex",
      scope: "project"
    }, workspace);
    const state = await getAppState(workspace);
    const insight = state.skillInsights.find((item) => item.slug === "callable");

    expect(insight?.callableAgents).toEqual(["codex"]);
    expect(insight?.compatibility.find((cell) => cell.agent === "codex")).toEqual(expect.objectContaining({
      callable: true,
      status: "installed"
    }));
  });

  it("bulk-installs selected skills and can remove an imported skill", async () => {
    const workspace = await makeTempDir("skillmgr-bulk-workspace-");
    const sourceRoot = await makeTempDir("skillmgr-bulk-source-");
    const alphaDir = await writeSkill(sourceRoot, "alpha", {
      name: "alpha",
      description: "Alpha skill."
    });
    const betaDir = await writeSkill(sourceRoot, "beta", {
      name: "beta",
      description: "Beta skill."
    });

    await importSkillAction({ source: alphaDir }, workspace);
    await importSkillAction({ source: betaDir }, workspace);
    const installed = await installSharedSkillsAction({
      skills: ["alpha", "beta"],
      scope: "project",
      targetRoot: path.join(workspace, "bulk-target")
    }, workspace);

    expect(installed).toHaveLength(4);
    await expect(fs.readFile(path.join(workspace, "bulk-target", "codex", "alpha", "SKILL.md"), "utf8")).resolves.toContain("name: alpha");
    await expect(fs.readFile(path.join(workspace, "bulk-target", "claude-code", "beta", "SKILL.md"), "utf8")).resolves.toContain("name: beta");

    await saveProfileAction({ name: "both", skills: ["alpha", "beta"] }, workspace);
    const removed = await deleteSkillAction({ skill: "alpha" }, workspace);
    const state = await getAppState(workspace);

    expect(removed.slug).toBe("alpha");
    expect(state.registrySkills.map((skill) => skill.slug)).toEqual(["beta"]);
    expect(state.profiles.find((profile) => profile.name === "both")?.skills).toEqual(["beta"]);
  });
});

describe("studio server", () => {
  it("serves the UI and state endpoint", async () => {
    const workspace = await makeTempDir("skillmgr-server-");
    const { server, url } = await startStudioServer({
      cwd: workspace,
      port: 0,
      webRoot: path.join(process.cwd(), "web")
    });
    servers.push(server);

    await expect(fetch(`${url}/`).then((response) => response.text())).resolves.toContain("Skill 管理台");
    const state = await fetch(`${url}/api/state`).then((response) => response.json());
    expect(state.agentRoots).toHaveLength(4);
  });

  it("does not serve files outside the web root", async () => {
    const workspace = await makeTempDir("skillmgr-server-");
    await fs.writeFile(path.join(workspace, "secret.txt"), "secret", "utf8");
    const { server, url } = await startStudioServer({
      cwd: workspace,
      port: 0,
      webRoot: path.join(process.cwd(), "web")
    });
    servers.push(server);

    const response = await fetch(`${url}/../secret.txt`);
    expect(response.status).not.toBe(200);
  });
});
