import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { AGENTS, type AgentId, type SkillManifest, type SkillValidationResult } from "./types.js";
import { slugify, uniqueSorted } from "./utils.js";

const ManifestFrontmatterSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    version: z.string().optional(),
    tags: z.array(z.string()).optional(),
    triggers: z.array(z.string()).optional(),
    aliases: z.array(z.string()).optional(),
    agents: z.array(z.enum(AGENTS)).optional()
  })
  .passthrough();

export async function validateSkillDir(skillDir: string): Promise<SkillValidationResult> {
  const skillFile = path.join(skillDir, "SKILL.md");
  const warnings: string[] = [];

  try {
    const file = await fs.readFile(skillFile, "utf8");
    const parsed = matter(file);
    const result = ManifestFrontmatterSchema.safeParse(parsed.data);

    if (!result.success) {
      return {
        ok: false,
        errors: result.error.issues.map((issue) => `${issue.path.join(".") || "frontmatter"}: ${issue.message}`),
        warnings
      };
    }

    const data = result.data;
    if (!parsed.content.trim()) {
      warnings.push("SKILL.md has no instruction body after frontmatter.");
    }

    const explicitTriggers = [...(data.triggers ?? []), ...(data.aliases ?? [])];
    const tags = uniqueSorted(data.tags ?? []);
    const slug = slugify(data.name);
    const triggers = uniqueSorted([...explicitTriggers, data.name, ...tags].map(slugify));

    const skill: SkillManifest = {
      name: data.name,
      description: data.description,
      version: data.version,
      tags,
      triggers,
      agents: data.agents ?? ([...AGENTS] as AgentId[]),
      sourcePath: path.resolve(skillDir),
      skillFile: path.resolve(skillFile),
      slug,
      instructions: parsed.content.trim(),
      files: await listSkillFiles(skillDir)
    };

    return { ok: true, skill, errors: [], warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: [`Cannot read SKILL.md: ${message}`], warnings };
  }
}

async function listSkillFiles(skillDir: string): Promise<string[]> {
  const files: string[] = [];
  await walk(skillDir, "");
  return files.sort();

  async function walk(currentDir: string, relativeDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git") {
        continue;
      }

      const relativePath = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, relativePath);
      } else {
        files.push(relativePath.replaceAll(path.sep, "/"));
      }
    }
  }
}
