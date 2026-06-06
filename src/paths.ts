import os from "node:os";
import path from "node:path";
import type { AgentId, SkillScope } from "./types.js";

export function projectRoot(cwd = process.cwd()): string {
  return cwd;
}

export function registryDir(cwd = process.cwd()): string {
  return path.join(projectRoot(cwd), ".skillmgr");
}

export function registryFile(cwd = process.cwd()): string {
  return path.join(registryDir(cwd), "registry.json");
}

export function sourceCacheDir(cwd = process.cwd()): string {
  return path.join(registryDir(cwd), "sources");
}

export function agentSkillDir(agent: AgentId, scope: SkillScope, cwd = process.cwd()): string {
  if (scope === "project") {
    return agent === "codex"
      ? path.join(cwd, ".agents", "skills")
      : path.join(cwd, ".claude", "skills");
  }

  return agent === "codex"
    ? path.join(os.homedir(), ".agents", "skills")
    : path.join(os.homedir(), ".claude", "skills");
}
