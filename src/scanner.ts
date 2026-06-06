import fs from "node:fs/promises";
import path from "node:path";
import { validateSkillDir } from "./skillParser.js";
import type { SkillManifest, SkillValidationResult } from "./types.js";
import { pathExists } from "./utils.js";

export async function scanSkillRoots(roots: string[]): Promise<SkillValidationResult[]> {
  const results: SkillValidationResult[] = [];

  for (const root of roots) {
    if (!(await pathExists(root))) {
      continue;
    }

    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      results.push(await validateSkillDir(path.join(root, entry.name)));
    }
  }

  return results;
}

export function validSkills(results: SkillValidationResult[]): SkillManifest[] {
  return results.flatMap((result) => (result.ok && result.skill ? [result.skill] : []));
}
