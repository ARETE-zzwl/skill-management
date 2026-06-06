import fs from "node:fs/promises";
import path from "node:path";
import type { Profile, RegistryData, RegistrySkill, SkillManifest } from "./types.js";
import { registryFile, sourceCacheDir } from "./paths.js";
import { validateSkillDir } from "./skillParser.js";
import { pathExists } from "./utils.js";

const EMPTY_REGISTRY: RegistryData = {
  skills: [],
  profiles: []
};

export class Registry {
  constructor(private readonly cwd = process.cwd()) {}

  async read(): Promise<RegistryData> {
    const file = registryFile(this.cwd);
    if (!(await pathExists(file))) {
      return { ...EMPTY_REGISTRY, skills: [], profiles: [] };
    }

    return hydrateRegistryData(JSON.parse(await fs.readFile(file, "utf8")) as RegistryData);
  }

  async write(data: RegistryData): Promise<void> {
    const file = registryFile(this.cwd);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  }

  async upsertSkill(skill: SkillManifest, source: string): Promise<RegistrySkill> {
    const data = await this.read();
    const registrySkill: RegistrySkill = {
      ...skill,
      source,
      importedAt: new Date().toISOString()
    };

    data.skills = [
      ...data.skills.filter((item) => item.slug !== registrySkill.slug || item.sourcePath !== registrySkill.sourcePath),
      registrySkill
    ].sort((a, b) => a.slug.localeCompare(b.slug));

    await this.write(data);
    return registrySkill;
  }

  async getSkill(slugOrName: string): Promise<RegistrySkill | undefined> {
    const data = await this.read();
    const normalized = slugOrName.trim().toLowerCase();
    return data.skills.find((skill) => skill.slug === normalized || skill.name.toLowerCase() === normalized);
  }

  async listSkills(): Promise<RegistrySkill[]> {
    const data = await this.read();
    return data.skills;
  }

  async removeSkill(slugOrName: string): Promise<RegistrySkill> {
    const data = await this.read();
    const normalized = slugOrName.trim().toLowerCase();
    const skill = data.skills.find((item) => item.slug === normalized || item.name.toLowerCase() === normalized);

    if (!skill) {
      throw new Error(`Skill not found in registry: ${slugOrName}`);
    }

    data.skills = data.skills.filter((item) => item !== skill);
    data.profiles = data.profiles.map((profile) => ({
      ...profile,
      skills: profile.skills.filter((profileSkill) => profileSkill !== skill.slug && profileSkill !== skill.name)
    }));

    await this.write(data);
    return skill;
  }

  async upsertProfile(profile: Omit<Profile, "updatedAt">): Promise<Profile> {
    const data = await this.read();
    const updated: Profile = {
      ...profile,
      updatedAt: new Date().toISOString()
    };

    data.profiles = [
      ...data.profiles.filter((item) => item.name !== profile.name),
      updated
    ].sort((a, b) => a.name.localeCompare(b.name));

    await this.write(data);
    return updated;
  }

  async getProfile(name: string): Promise<Profile | undefined> {
    const data = await this.read();
    return data.profiles.find((profile) => profile.name === name);
  }

  async listProfiles(): Promise<Profile[]> {
    const data = await this.read();
    return data.profiles;
  }

  sourceCachePath(slug: string): string {
    return path.join(sourceCacheDir(this.cwd), slug);
  }
}

async function hydrateRegistryData(data: RegistryData): Promise<RegistryData> {
  const skills = await Promise.all(data.skills.map(async (skill) => {
    if (skill.instructions !== undefined && skill.files !== undefined) {
      return skill;
    }

    const result = await validateSkillDir(skill.sourcePath);
    if (!result.ok || !result.skill) {
      return {
        ...skill,
        instructions: skill.instructions ?? "",
        files: skill.files ?? []
      };
    }

    return {
      ...skill,
      instructions: result.skill.instructions,
      files: result.skill.files
    };
  }));

  return {
    skills,
    profiles: data.profiles
  };
}
