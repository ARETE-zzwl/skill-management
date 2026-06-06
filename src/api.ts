import path from "node:path";
import { detectConflicts } from "./conflicts.js";
import { CATALOG_SKILLS } from "./catalog.js";
import { installSkill } from "./installer.js";
import { importSkill } from "./importer.js";
import { agentSkillDir } from "./paths.js";
import { PROFILE_TEMPLATES } from "./profileTemplates.js";
import { recommendProfiles } from "./recommendations.js";
import { Registry } from "./registry.js";
import { scanSkillRoots, validSkills } from "./scanner.js";
import { scanSkillSecurity } from "./securityScanner.js";
import {
  AGENTS,
  type AgentId,
  type AppState,
  type CompatibilityCell,
  type InstalledSkillRoot,
  type SkillInsight,
  type SkillManifest,
  type SkillScope
} from "./types.js";

export async function getAppState(cwd = process.cwd()): Promise<AppState> {
  const registry = new Registry(cwd);
  const registrySkills = await registry.listSkills();
  const profiles = await registry.listProfiles();
  const roots = AGENTS.flatMap((agent) =>
    (["user", "project"] as SkillScope[]).map((scope) => ({
      agent,
      scope,
      path: agentSkillDir(agent, scope, cwd)
    }))
  );

  const installedRoots = await Promise.all(
    roots.map(async (root) => ({
      ...root,
      skills: validSkills(await scanSkillRoots([root.path])).map(lightSkill)
    }))
  );
  const skillInsights = await buildSkillInsights(registrySkills, installedRoots);

  return {
    registrySkills,
    profiles,
    conflicts: detectConflicts(registrySkills),
    installedRoots,
    recommendations: recommendProfiles(registrySkills),
    catalog: CATALOG_SKILLS,
    skillInsights,
    profileTemplates: PROFILE_TEMPLATES,
    agentRoots: roots
  };
}

function lightSkill(skill: SkillManifest): SkillManifest {
  return {
    ...skill,
    instructions: "",
    files: []
  };
}

async function buildSkillInsights(skills: SkillManifest[], installedRoots: InstalledSkillRoot[]): Promise<SkillInsight[]> {
  return Promise.all(skills.map(async (skill) => {
    const compatibility = buildCompatibility(skill, installedRoots);

    return {
      slug: skill.slug,
      callableAgents: compatibility.filter((cell) => cell.callable).map((cell) => cell.agent),
      compatibility,
      security: await scanSkillSecurity(skill),
      invocationExamples: invocationExamplesFor(skill)
    };
  }));
}

function buildCompatibility(skill: SkillManifest, installedRoots: InstalledSkillRoot[]): CompatibilityCell[] {
  return AGENTS.map((agent) => {
    const supported = skill.agents.includes(agent);
    const installedScopes = installedRoots
      .filter((root) => root.agent === agent && root.skills.some((installedSkill) => installedSkill.slug === skill.slug))
      .map((root) => root.scope);
    const callable = supported && installedScopes.length > 0;

    return {
      agent,
      supported,
      callable,
      installedScopes,
      status: !supported ? "unsupported" : installedScopes.length > 0 ? "installed" : "supported",
      note: compatibilityNote(agent, supported, installedScopes)
    };
  });
}

function compatibilityNote(agent: AgentId, supported: boolean, installedScopes: SkillScope[]): string {
  if (!supported) {
    return `未声明支持 ${agentLabel(agent)}。`;
  }
  if (installedScopes.length > 0) {
    return `已安装到 ${installedScopes.map(scopeLabel).join("、")}；新会话或刷新后的 agent 可调用。`;
  }
  return `已导入管理库，但还没有安装到 ${agentLabel(agent)}，agent 暂不能直接调用。`;
}

function invocationExamplesFor(skill: SkillManifest): string[] {
  const catalogSkill = CATALOG_SKILLS.find((item) => item.name === skill.slug || item.name === skill.name);
  if (catalogSkill) {
    return [catalogSkill.examplePrompt];
  }

  return [
    `使用 ${skill.name} skill，帮我处理相关任务。`,
    `调用 ${skill.name}，并按它的使用说明执行。`
  ];
}

function agentLabel(agent: AgentId): string {
  return agent === "claude-code" ? "Claude Code" : "Codex";
}

function scopeLabel(scope: SkillScope): string {
  return scope === "user" ? "全局用户" : "当前项目";
}

export async function importSkillAction(input: { source: string; subdir?: string }, cwd = process.cwd()) {
  if (!input.source?.trim()) {
    throw new Error("Source is required.");
  }

  return importSkill(input.source.trim(), {
    cwd,
    subdir: input.subdir?.trim() || undefined
  });
}

export async function installSkillAction(
  input: { skill: string; agent: AgentId; scope: SkillScope; targetRoot?: string },
  cwd = process.cwd()
) {
  const registry = new Registry(cwd);
  const skill = await registry.getSkill(input.skill);
  if (!skill) {
    throw new Error(`Skill not found in registry: ${input.skill}`);
  }

  return installSkill(skill, {
    agent: input.agent,
    scope: input.scope,
    cwd,
    targetRoot: input.targetRoot?.trim() || undefined
  });
}

export async function installSharedSkillAction(
  input: { skill: string; scope: SkillScope; agents?: AgentId[]; targetRoot?: string },
  cwd = process.cwd()
) {
  const registry = new Registry(cwd);
  const skill = await registry.getSkill(input.skill);
  if (!skill) {
    throw new Error(`Skill not found in registry: ${input.skill}`);
  }

  const targetAgents = (input.agents?.length ? input.agents : [...AGENTS]).filter((agent) => skill.agents.includes(agent));
  if (targetAgents.length === 0) {
    throw new Error(`${skill.name} does not declare support for any selected agent.`);
  }

  const installed: Array<{ agent: AgentId; target: string }> = [];
  for (const agent of targetAgents) {
    installed.push({
      agent,
      target: await installSkill(skill, {
        agent,
        scope: input.scope,
        cwd,
        targetRoot: input.targetRoot ? path.join(input.targetRoot.trim(), agent) : undefined
      })
    });
  }

  return installed;
}

export async function installSharedSkillsAction(
  input: { skills: string[]; scope: SkillScope; agents?: AgentId[]; targetRoot?: string },
  cwd = process.cwd()
) {
  const skills = input.skills.map((skill) => skill.trim()).filter(Boolean);
  if (skills.length === 0) {
    throw new Error("At least one skill is required.");
  }

  const installed: Array<{ skill: string; agent: AgentId; target: string }> = [];
  for (const skill of skills) {
    const results = await installSharedSkillAction({
      skill,
      scope: input.scope,
      agents: input.agents,
      targetRoot: input.targetRoot
    }, cwd);

    installed.push(...results.map((item) => ({
      skill,
      agent: item.agent,
      target: item.target
    })));
  }

  return installed;
}

export async function importCatalogSkillAction(input: { id: string }, cwd = process.cwd()) {
  const catalogSkill = CATALOG_SKILLS.find((skill) => skill.id === input.id);
  if (!catalogSkill) {
    throw new Error(`Catalog skill not found: ${input.id}`);
  }

  return importSkill(catalogSkill.source, {
    cwd,
    subdir: catalogSkill.subdir
  });
}

export async function importCatalogSkillsAction(input: { ids: string[] }, cwd = process.cwd()) {
  const ids = input.ids.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    throw new Error("At least one catalog skill id is required.");
  }

  const imported = [];
  for (const id of ids) {
    imported.push(await importCatalogSkillAction({ id }, cwd));
  }

  return imported;
}

export async function importAndInstallCatalogSkillAction(
  input: { id: string; scope: SkillScope; agents?: AgentId[]; targetRoot?: string },
  cwd = process.cwd()
) {
  const skill = await importCatalogSkillAction({ id: input.id }, cwd);
  const installed = await installSharedSkillAction({
    skill: skill.slug,
    scope: input.scope,
    agents: input.agents,
    targetRoot: input.targetRoot
  }, cwd);

  return {
    skill,
    installed
  };
}

export async function deleteSkillAction(input: { skill: string }, cwd = process.cwd()) {
  if (!input.skill?.trim()) {
    throw new Error("Skill is required.");
  }

  const registry = new Registry(cwd);
  return registry.removeSkill(input.skill);
}

export async function saveProfileAction(
  input: { name: string; skills: string[]; agent?: AgentId },
  cwd = process.cwd()
) {
  if (!input.name?.trim()) {
    throw new Error("Profile name is required.");
  }

  const skills = input.skills.map((skill) => skill.trim()).filter(Boolean);
  if (skills.length === 0) {
    throw new Error("At least one skill is required.");
  }

  const registry = new Registry(cwd);
  return registry.upsertProfile({
    name: input.name.trim(),
    skills,
    agent: input.agent
  });
}

export async function applyProfileAction(
  input: { name: string; agent?: AgentId; scope: SkillScope; targetRoot?: string },
  cwd = process.cwd()
) {
  const registry = new Registry(cwd);
  const profile = await registry.getProfile(input.name);
  if (!profile) {
    throw new Error(`Profile not found: ${input.name}`);
  }

  const agent = input.agent ?? profile.agent ?? "codex";
  const installed: Array<{ skill: string; target: string }> = [];

  for (const skillSlug of profile.skills) {
    const skill = await registry.getSkill(skillSlug);
    if (!skill) {
      throw new Error(`Profile ${profile.name} references missing skill: ${skillSlug}`);
    }

    installed.push({
      skill: skill.slug,
      target: await installSkill(skill, {
        agent,
        scope: input.scope,
        cwd,
        targetRoot: input.targetRoot?.trim() || undefined
      })
    });
  }

  return installed;
}
