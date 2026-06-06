import { describe, expect, it } from "vitest";
import { recommendProfiles } from "../src/recommendations.js";
import type { RegistrySkill } from "../src/types.js";

describe("recommendProfiles", () => {
  it("groups related skills into suggested profiles", () => {
    const recommendations = recommendProfiles([
      skill({ slug: "pdf", tags: ["documents"], triggers: ["pdf"] }),
      skill({ slug: "docx", tags: ["documents"], triggers: ["docx"] }),
      skill({ slug: "frontend-design", tags: ["frontend"], triggers: ["ui"] })
    ]);

    expect(recommendations).toContainEqual(expect.objectContaining({
      name: "documents",
      skills: ["docx", "pdf"]
    }));
    expect(recommendations.some((item) => item.name === "frontend")).toBe(false);
  });
});

function skill(overrides: Partial<RegistrySkill>): RegistrySkill {
  return {
    name: "skill",
    description: "Test skill.",
    tags: [],
    triggers: [],
    agents: ["codex", "claude-code"],
    sourcePath: "/tmp/skill",
    skillFile: "/tmp/skill/SKILL.md",
    slug: "skill",
    instructions: "Use this test skill.",
    files: ["SKILL.md"],
    source: "test",
    importedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}
