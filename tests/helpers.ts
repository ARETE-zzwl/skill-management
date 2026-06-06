import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function writeSkill(
  root: string,
  dirname: string,
  frontmatter: Record<string, unknown>,
  body = "# Test Skill\n\nUse this test skill."
): Promise<string> {
  const skillDir = path.join(root, dirname);
  await fs.mkdir(skillDir, { recursive: true });
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map((item) => `  - ${item}`).join("\n")}`;
      }
      return `${key}: ${value}`;
    })
    .join("\n");

  await fs.writeFile(path.join(skillDir, "SKILL.md"), `---\n${yaml}\n---\n\n${body}\n`, "utf8");
  return skillDir;
}
