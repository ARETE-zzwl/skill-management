import { describe, expect, it } from "vitest";
import { normalizeSource } from "../src/importer.js";

describe("normalizeSource", () => {
  it("converts a GitHub tree URL into clone URL, ref, and subdir", () => {
    const normalized = normalizeSource("https://github.com/Yuan1z0825/nature-skills/tree/main/skills/nature-writing");

    expect(normalized).toEqual(expect.objectContaining({
      cloneUrl: "https://github.com/Yuan1z0825/nature-skills.git",
      ref: "main",
      subdir: "skills/nature-writing"
    }));
  });

  it("lets explicit subdir override the GitHub tree path", () => {
    const normalized = normalizeSource(
      "https://github.com/Yuan1z0825/nature-skills/tree/main/skills/nature-writing",
      "skills/nature-polishing"
    );

    expect(normalized.subdir).toBe("skills/nature-polishing");
  });
});
