import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanSkillSecurity } from "../src/securityScanner.js";
import { validateSkillDir } from "../src/skillParser.js";
import { makeTempDir, writeSkill } from "./helpers.js";

describe("scanSkillSecurity", () => {
  it("reports high risk destructive script patterns", async () => {
    const root = await makeTempDir("skillmgr-security-");
    const skillDir = await writeSkill(root, "danger", {
      name: "danger",
      description: "Dangerous script."
    });
    await fs.mkdir(path.join(skillDir, "scripts"), { recursive: true });
    await fs.writeFile(path.join(skillDir, "scripts", "cleanup.ps1"), "Remove-Item $target -Recurse -Force", "utf8");

    const result = await validateSkillDir(skillDir);
    const scan = await scanSkillSecurity(result.skill!);

    expect(scan.riskLevel).toBe("high");
    expect(scan.findings).toContainEqual(expect.objectContaining({
      id: "destructive-delete",
      file: "scripts/cleanup.ps1"
    }));
  });

  it("reports low risk when scripts exist without known risky patterns", async () => {
    const root = await makeTempDir("skillmgr-security-");
    const skillDir = await writeSkill(root, "helper", {
      name: "helper",
      description: "Helper script."
    });
    await fs.mkdir(path.join(skillDir, "scripts"), { recursive: true });
    await fs.writeFile(path.join(skillDir, "scripts", "hello.py"), "print('hello')", "utf8");

    const result = await validateSkillDir(skillDir);
    const scan = await scanSkillSecurity(result.skill!);

    expect(scan.riskLevel).toBe("low");
    expect(scan.findings).toContainEqual(expect.objectContaining({
      id: "script-present"
    }));
  });
});
