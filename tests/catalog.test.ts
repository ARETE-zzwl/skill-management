import { describe, expect, it } from "vitest";
import { CATALOG_SKILLS } from "../src/catalog.js";
import { AGENTS } from "../src/types.js";

describe("CATALOG_SKILLS", () => {
  it("has unique ids and installable sources", () => {
    const ids = new Set<string>();

    for (const skill of CATALOG_SKILLS) {
      expect(ids.has(skill.id), `${skill.id} is duplicated`).toBe(false);
      ids.add(skill.id);

      expect(skill.source, `${skill.id} source`).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+\/tree\/[^/]+\/.+/);
      expect(skill.name, `${skill.id} name`).toMatch(/^[a-z0-9._-]+$/);
      expect(skill.agents.every((agent) => AGENTS.includes(agent)), `${skill.id} agents`).toBe(true);
    }
  });

  it("contains high-star official source groups", () => {
    expect(CATALOG_SKILLS.some((skill) => skill.repository === "https://github.com/anthropics/skills")).toBe(true);
    expect(CATALOG_SKILLS.some((skill) => skill.repository === "https://github.com/vercel-labs/agent-skills")).toBe(true);
    expect(CATALOG_SKILLS.some((skill) => skill.repository === "https://github.com/vercel-labs/skills")).toBe(true);
    expect(CATALOG_SKILLS.some((skill) => skill.repository === "https://github.com/microsoft/skills")).toBe(true);
    expect(CATALOG_SKILLS.some((skill) => skill.repository === "https://github.com/apify/agent-skills")).toBe(true);
    expect(CATALOG_SKILLS.some((skill) => skill.repository === "https://github.com/mattpocock/skills")).toBe(true);
    expect(CATALOG_SKILLS.some((skill) => skill.repository === "https://github.com/addyosmani/agent-skills")).toBe(true);
    expect(CATALOG_SKILLS.some((skill) => skill.repository === "https://github.com/github/awesome-copilot")).toBe(true);
    expect(CATALOG_SKILLS.some((skill) => skill.repository === "https://github.com/addyosmani/web-quality-skills")).toBe(true);
  });
});
