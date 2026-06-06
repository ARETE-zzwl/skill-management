import type { SkillConflict, SkillManifest } from "./types.js";

export function detectConflicts(skills: SkillManifest[]): SkillConflict[] {
  const conflicts: SkillConflict[] = [];
  const byName = groupBy(skills, (skill) => skill.slug);
  const byTrigger = new Map<string, SkillManifest[]>();

  for (const [slug, matches] of byName.entries()) {
    if (matches.length > 1) {
      conflicts.push({
        type: "name",
        severity: "error",
        message: `Multiple skills use the name "${slug}". Install would overwrite unless one is renamed.`,
        skills: matches.map(formatSkillRef)
      });
    }
  }

  for (const skill of skills) {
    for (const trigger of skill.triggers) {
      const matches = byTrigger.get(trigger) ?? [];
      matches.push(skill);
      byTrigger.set(trigger, matches);
    }
  }

  for (const [trigger, matches] of byTrigger.entries()) {
    const uniqueSkillSlugs = new Set(matches.map((skill) => skill.slug));
    if (uniqueSkillSlugs.size > 1) {
      conflicts.push({
        type: "trigger",
        severity: "warning",
        message: `Trigger "${trigger}" is shared by ${uniqueSkillSlugs.size} skills. Agent selection may become ambiguous.`,
        skills: [...new Map(matches.map((skill) => [skill.slug, formatSkillRef(skill)])).values()]
      });
    }
  }

  return conflicts.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.message.localeCompare(b.message));
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function formatSkillRef(skill: SkillManifest): string {
  return `${skill.name} (${skill.sourcePath})`;
}

function severityRank(severity: SkillConflict["severity"]): number {
  return severity === "error" ? 0 : 1;
}
