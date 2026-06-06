import type { Profile, RegistrySkill, SkillConflict, SkillManifest, SkillValidationResult } from "./types.js";

export function formatSkillTable(skills: SkillManifest[]): string {
  if (skills.length === 0) {
    return "No skills found.";
  }

  return [
    ["Name", "Agents", "Triggers", "Path"].join(" | "),
    ["---", "---", "---", "---"].join(" | "),
    ...skills.map((skill) =>
      [skill.name, skill.agents.join(","), skill.triggers.join(","), skill.sourcePath].join(" | ")
    )
  ].join("\n");
}

export function formatRegistrySkillTable(skills: RegistrySkill[]): string {
  return formatSkillTable(skills);
}

export function formatValidation(result: SkillValidationResult): string {
  const lines: string[] = [];
  lines.push(result.ok ? "OK" : "INVALID");

  if (result.skill) {
    lines.push(`Name: ${result.skill.name}`);
    lines.push(`Description: ${result.skill.description}`);
    lines.push(`Agents: ${result.skill.agents.join(", ")}`);
    lines.push(`Triggers: ${result.skill.triggers.join(", ")}`);
  }

  for (const warning of result.warnings) {
    lines.push(`Warning: ${warning}`);
  }

  for (const error of result.errors) {
    lines.push(`Error: ${error}`);
  }

  return lines.join("\n");
}

export function formatConflicts(conflicts: SkillConflict[]): string {
  if (conflicts.length === 0) {
    return "No conflicts found.";
  }

  return conflicts
    .map((conflict) => [
      `[${conflict.severity.toUpperCase()}] ${conflict.message}`,
      `Skills: ${conflict.skills.join("; ")}`
    ].join("\n"))
    .join("\n\n");
}

export function formatProfiles(profiles: Profile[]): string {
  if (profiles.length === 0) {
    return "No profiles found.";
  }

  return profiles
    .map((profile) => `${profile.name}: ${profile.skills.join(", ")}${profile.agent ? ` (${profile.agent})` : ""}`)
    .join("\n");
}
