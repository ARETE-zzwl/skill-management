import { describe, expect, it } from "vitest";
import { detectConflicts } from "../src/conflicts.js";
import type { SkillManifest } from "../src/types.js";

describe("detectConflicts", () => {
  it("reports duplicate skill names as errors", () => {
    const conflicts = detectConflicts([
      skill({ name: "pdf", slug: "pdf", sourcePath: "/a/pdf" }),
      skill({ name: "pdf", slug: "pdf", sourcePath: "/b/pdf" })
    ]);

    expect(conflicts).toContainEqual(expect.objectContaining({
      type: "name",
      severity: "error"
    }));
  });

  it("reports shared triggers as warnings", () => {
    const conflicts = detectConflicts([
      skill({ name: "pdf", slug: "pdf", triggers: ["pdf"] }),
      skill({ name: "document-pdf", slug: "document-pdf", triggers: ["pdf"] })
    ]);

    expect(conflicts).toContainEqual(expect.objectContaining({
      type: "trigger",
      severity: "warning"
    }));
  });
});

function skill(overrides: Partial<SkillManifest>): SkillManifest {
  return {
    name: "skill",
    description: "Test skill.",
    tags: [],
    triggers: ["skill"],
    agents: ["codex", "claude-code"],
    sourcePath: "/tmp/skill",
    skillFile: "/tmp/skill/SKILL.md",
    slug: "skill",
    instructions: "Use this test skill.",
    files: ["SKILL.md"],
    ...overrides
  };
}
