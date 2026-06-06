import path from "node:path";
import type { AgentId, RegistrySkill, SkillScope } from "./types.js";
import { agentSkillDir } from "./paths.js";
import { copyDir } from "./utils.js";

export async function installSkill(
  skill: RegistrySkill,
  options: { agent: AgentId; scope: SkillScope; cwd?: string; targetRoot?: string }
): Promise<string> {
  if (!skill.agents.includes(options.agent)) {
    throw new Error(`${skill.name} does not declare support for ${options.agent}.`);
  }

  const baseDir = options.targetRoot
    ? path.resolve(options.targetRoot)
    : agentSkillDir(options.agent, options.scope, options.cwd ?? process.cwd());
  const targetDir = path.join(baseDir, skill.slug);

  await copyDir(skill.sourcePath, targetDir);
  return targetDir;
}
