import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { validateSkillDir } from "./skillParser.js";
import type { RegistrySkill } from "./types.js";
import { Registry } from "./registry.js";
import { copyDir, pathExists, slugify } from "./utils.js";

export async function importSkill(source: string, options: { cwd?: string; subdir?: string } = {}): Promise<RegistrySkill> {
  const cwd = options.cwd ?? process.cwd();
  const registry = new Registry(cwd);
  const normalized = normalizeSource(source, options.subdir);
  const localSource = await materializeSource(normalized, registry);
  const result = await validateSkillDir(localSource);

  if (!result.ok || !result.skill) {
    throw new Error(`Invalid skill source:\n${result.errors.join("\n")}`);
  }

  return registry.upsertSkill(result.skill, source);
}

export interface NormalizedSource {
  original: string;
  cloneUrl?: string;
  ref?: string;
  localPath?: string;
  subdir?: string;
}

async function materializeSource(source: NormalizedSource, registry: Registry): Promise<string> {
  if (source.localPath) {
    return materializeLocalSource(source.localPath, registry);
  }

  if (!source.cloneUrl) {
    throw new Error(`Source does not exist locally and is not a supported Git URL: ${source.original}`);
  }

  const cacheRoot = registry.sourceCachePath(slugify([source.cloneUrl, source.ref, source.subdir].filter(Boolean).join("-")));
  await fs.rm(cacheRoot, { recursive: true, force: true });
  await cloneGitSource(source.cloneUrl, cacheRoot, source.ref, source.subdir);
  return source.subdir ? path.join(cacheRoot, source.subdir) : cacheRoot;
}

async function materializeLocalSource(source: string, registry: Registry): Promise<string> {
  const resolved = path.resolve(source);
  if (await pathExists(resolved)) {
    const result = await validateSkillDir(resolved);
    if (!result.ok || !result.skill) {
      throw new Error(`Invalid skill source:\n${result.errors.join("\n")}`);
    }

    const target = registry.sourceCachePath(result.skill.slug);
    await copyDir(resolved, target);
    return target;
  }

  throw new Error(`Local source does not exist: ${source}`);
}

export function normalizeSource(source: string, subdir?: string): NormalizedSource {
  const trimmedSource = source.trim();
  const resolved = path.resolve(trimmedSource);
  const githubTree = parseGitHubTreeUrl(trimmedSource);

  if (githubTree) {
    return {
      original: trimmedSource,
      cloneUrl: githubTree.cloneUrl,
      ref: githubTree.ref,
      subdir: subdir?.trim() || githubTree.subdir
    };
  }

  if (isGitSource(trimmedSource)) {
    return {
      original: trimmedSource,
      cloneUrl: trimmedSource,
      subdir: subdir?.trim() || undefined
    };
  }

  return {
    original: trimmedSource,
    localPath: resolved,
    subdir: subdir?.trim() || undefined
  };
}

function parseGitHubTreeUrl(source: string): { cloneUrl: string; ref: string; subdir: string } | undefined {
  const match = source.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/);
  if (!match) {
    return undefined;
  }

  const [, owner, repo, ref, treePath] = match;
  return {
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
    ref,
    subdir: decodeURIComponent(treePath)
  };
}

function isGitSource(source: string): boolean {
  return source.startsWith("https://") || source.startsWith("git@") || source.endsWith(".git");
}

async function cloneGitSource(source: string, target: string, ref?: string, subdir?: string): Promise<void> {
  const args = ["clone", "--depth", "1"];
  if (subdir) {
    args.push("--filter=blob:none", "--sparse");
  }
  if (ref) {
    args.push("--branch", ref);
  }
  args.push(source, target);

  await runGit(args, "git clone");
  if (subdir) {
    await runGit(["-C", target, "sparse-checkout", "set", subdir], "git sparse-checkout");
  }
}

function runGit(args: string[], label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} failed with exit code ${code}`));
      }
    });
  });
}

export async function importLocalCopy(source: string, target: string): Promise<string> {
  await copyDir(source, target);
  return target;
}
