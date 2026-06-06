#!/usr/bin/env node
import { Command } from "commander";
import { detectConflicts } from "./conflicts.js";
import { formatConflicts, formatProfiles, formatRegistrySkillTable, formatSkillTable, formatValidation } from "./format.js";
import { importSkill } from "./importer.js";
import { installSkill } from "./installer.js";
import { agentSkillDir } from "./paths.js";
import { Registry } from "./registry.js";
import { scanSkillRoots, validSkills } from "./scanner.js";
import { validateSkillDir } from "./skillParser.js";
import { AGENTS, type AgentId, type SkillScope } from "./types.js";

const program = new Command();

program
  .name("skillmgr")
  .description("Local-first AI agent skill manager demo for Codex and Claude Code.")
  .version("0.1.0");

program
  .command("validate")
  .description("Validate a skill directory.")
  .argument("<path>", "Path to a skill directory")
  .action(async (skillPath: string) => {
    const result = await validateSkillDir(skillPath);
    console.log(formatValidation(result));
    process.exitCode = result.ok ? 0 : 1;
  });

program
  .command("scan")
  .description("Scan installed skills or the local registry.")
  .option("--agent <agent>", "Agent to scan: codex, claude-code, all", "all")
  .option("--scope <scope>", "Scope to scan: user, project, all", "all")
  .option("--root <path>", "Scan an explicit skills root")
  .option("--registry", "List skills already imported into the local registry")
  .action(async (options: { agent: string; scope: string; root?: string; registry?: boolean }) => {
    if (options.registry) {
      const registry = new Registry();
      console.log(formatRegistrySkillTable(await registry.listSkills()));
      return;
    }

    const roots = options.root ? [options.root] : scanRoots(options.agent, options.scope);
    const results = await scanSkillRoots(roots);
    console.log(formatSkillTable(validSkills(results)));
  });

program
  .command("import")
  .description("Import a local skill directory or Git repository into the registry.")
  .argument("<source>", "Local path or Git URL")
  .option("--subdir <path>", "Skill subdirectory inside a Git repository")
  .action(async (source: string, options: { subdir?: string }) => {
    const skill = await importSkill(source, { subdir: options.subdir });
    console.log(`Imported ${skill.name} from ${skill.sourcePath}`);
  });

program
  .command("conflicts")
  .description("Detect conflicts in the local registry.")
  .action(async () => {
    const registry = new Registry();
    const conflicts = detectConflicts(await registry.listSkills());
    console.log(formatConflicts(conflicts));
    process.exitCode = conflicts.some((conflict) => conflict.severity === "error") ? 1 : 0;
  });

program
  .command("install")
  .description("Install an imported skill into an agent skill directory.")
  .argument("<skill>", "Skill name or slug")
  .requiredOption("--agent <agent>", "Target agent: codex or claude-code")
  .option("--scope <scope>", "Target scope: user or project", "project")
  .option("--target-root <path>", "Override installation root for testing")
  .action(async (skillName: string, options: { agent: string; scope: string; targetRoot?: string }) => {
    const agent = parseAgent(options.agent);
    const scope = parseScope(options.scope);
    const registry = new Registry();
    const skill = await registry.getSkill(skillName);

    if (!skill) {
      throw new Error(`Skill not found in registry: ${skillName}`);
    }

    const target = await installSkill(skill, { agent, scope, targetRoot: options.targetRoot });
    console.log(`Installed ${skill.name} to ${target}`);
  });

const profile = program.command("profile").description("Manage skill profiles.");

profile
  .command("create")
  .description("Create or update a named skill profile.")
  .argument("<name>", "Profile name")
  .requiredOption("--skills <skills>", "Comma-separated skill slugs")
  .option("--agent <agent>", "Preferred agent for this profile")
  .action(async (name: string, options: { skills: string; agent?: string }) => {
    const registry = new Registry();
    const skills = options.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
    const agent = options.agent ? parseAgent(options.agent) : undefined;
    const profile = await registry.upsertProfile({ name, skills, agent });
    console.log(`Saved profile ${profile.name}: ${profile.skills.join(", ")}`);
  });

profile
  .command("list")
  .description("List profiles.")
  .action(async () => {
    const registry = new Registry();
    console.log(formatProfiles(await registry.listProfiles()));
  });

profile
  .command("apply")
  .description("Install every skill in a profile.")
  .argument("<name>", "Profile name")
  .option("--agent <agent>", "Target agent. Defaults to profile agent or codex")
  .option("--scope <scope>", "Target scope: user or project", "project")
  .option("--target-root <path>", "Override installation root for testing")
  .action(async (name: string, options: { agent?: string; scope: string; targetRoot?: string }) => {
    const registry = new Registry();
    const profile = await registry.getProfile(name);

    if (!profile) {
      throw new Error(`Profile not found: ${name}`);
    }

    const agent = options.agent ? parseAgent(options.agent) : profile.agent ?? "codex";
    const scope = parseScope(options.scope);

    for (const skillSlug of profile.skills) {
      const skill = await registry.getSkill(skillSlug);
      if (!skill) {
        throw new Error(`Profile ${name} references missing skill: ${skillSlug}`);
      }
      const target = await installSkill(skill, { agent, scope, targetRoot: options.targetRoot });
      console.log(`Installed ${skill.name} to ${target}`);
    }
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function scanRoots(agentOption: string, scopeOption: string): string[] {
  const agents = agentOption === "all" ? [...AGENTS] : [parseAgent(agentOption)];
  const scopes = scopeOption === "all" ? (["user", "project"] as SkillScope[]) : [parseScope(scopeOption)];
  return agents.flatMap((agent) => scopes.map((scope) => agentSkillDir(agent, scope)));
}

function parseAgent(value: string): AgentId {
  if (AGENTS.includes(value as AgentId)) {
    return value as AgentId;
  }
  throw new Error(`Unsupported agent "${value}". Use codex or claude-code.`);
}

function parseScope(value: string): SkillScope {
  if (value === "user" || value === "project") {
    return value;
  }
  throw new Error(`Unsupported scope "${value}". Use user or project.`);
}
