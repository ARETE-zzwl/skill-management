import { describe, expect, it } from "vitest";
import { validateSkillDir } from "../src/skillParser.js";
import { makeTempDir, writeSkill } from "./helpers.js";

describe("validateSkillDir", () => {
  it("parses required frontmatter and normalizes triggers", async () => {
    const root = await makeTempDir("skillmgr-parser-");
    const skillDir = await writeSkill(root, "PDF Tools", {
      name: "PDF Tools",
      description: "Work with PDF files.",
      tags: ["documents"],
      triggers: ["PDF", "ocr"],
      agents: ["codex"]
    });

    const result = await validateSkillDir(skillDir);

    expect(result.ok).toBe(true);
    expect(result.skill?.slug).toBe("pdf-tools");
    expect(result.skill?.agents).toEqual(["codex"]);
    expect(result.skill?.triggers).toEqual(["documents", "ocr", "pdf", "pdf-tools"]);
    expect(result.skill?.instructions).toContain("Use this test skill");
    expect(result.skill?.files).toContain("SKILL.md");
  });

  it("rejects skills without required metadata", async () => {
    const root = await makeTempDir("skillmgr-parser-");
    const skillDir = await writeSkill(root, "bad", {
      name: "bad"
    });

    const result = await validateSkillDir(skillDir);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("description");
  });
});
