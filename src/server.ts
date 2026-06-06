#!/usr/bin/env node
import fs from "node:fs/promises";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyProfileAction,
  deleteSkillAction,
  getAppState,
  importAndInstallCatalogSkillAction,
  importCatalogSkillAction,
  importCatalogSkillsAction,
  importSkillAction,
  installSharedSkillAction,
  installSharedSkillsAction,
  installSkillAction,
  saveProfileAction
} from "./api.js";
import { AGENTS, type AgentId, type SkillScope } from "./types.js";

const DEFAULT_PORT = 4317;

export interface StudioServerOptions {
  cwd?: string;
  port?: number;
  webRoot?: string;
}

export function createStudioServer(options: StudioServerOptions = {}) {
  const cwd = options.cwd ?? process.cwd();
  const webRoot = options.webRoot ?? path.join(cwd, "web");

  return http.createServer((request, response) => {
    void handleRequest(request, response, cwd, webRoot);
  });
}

export async function startStudioServer(options: StudioServerOptions = {}) {
  const port = options.port ?? Number(process.env.PORT ?? DEFAULT_PORT);
  const server = createStudioServer(options);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, resolve);
  });

  const address = server.address() as AddressInfo;
  return {
    server,
    url: `http://localhost:${address.port}`
  };
}

async function handleRequest(request: IncomingMessage, response: ServerResponse, cwd: string, webRoot: string) {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url, cwd);
      return;
    }

    await serveStatic(url.pathname, response, webRoot);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function handleApi(request: IncomingMessage, response: ServerResponse, url: URL, cwd: string) {
  if (request.method === "GET" && url.pathname === "/api/state") {
    sendJson(response, 200, await getAppState(cwd));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/import") {
    const body = await readJson(request);
    sendJson(response, 200, {
      skill: await importSkillAction({
        source: String(body.source ?? ""),
        subdir: optionalString(body.subdir)
      }, cwd)
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/catalog/import") {
    const body = await readJson(request);
    sendJson(response, 200, {
      skill: await importCatalogSkillAction({
        id: String(body.id ?? "")
      }, cwd)
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/catalog/import-bulk") {
    const body = await readJson(request);
    sendJson(response, 200, {
      skills: await importCatalogSkillsAction({
        ids: parseStrings(body.ids)
      }, cwd)
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/catalog/import-install") {
    const body = await readJson(request);
    sendJson(response, 200, await importAndInstallCatalogSkillAction({
      id: String(body.id ?? ""),
      agents: parseAgents(body.agents),
      scope: parseScope(body.scope),
      targetRoot: optionalString(body.targetRoot)
    }, cwd));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/install") {
    const body = await readJson(request);
    sendJson(response, 200, {
      target: await installSkillAction({
        skill: String(body.skill ?? ""),
        agent: parseAgent(body.agent),
        scope: parseScope(body.scope),
        targetRoot: optionalString(body.targetRoot)
      }, cwd)
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/install/shared") {
    const body = await readJson(request);
    sendJson(response, 200, {
      installed: await installSharedSkillAction({
        skill: String(body.skill ?? ""),
        agents: parseAgents(body.agents),
        scope: parseScope(body.scope),
        targetRoot: optionalString(body.targetRoot)
      }, cwd)
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/install/shared-bulk") {
    const body = await readJson(request);
    sendJson(response, 200, {
      installed: await installSharedSkillsAction({
        skills: parseStrings(body.skills),
        agents: parseAgents(body.agents),
        scope: parseScope(body.scope),
        targetRoot: optionalString(body.targetRoot)
      }, cwd)
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/skills/delete") {
    const body = await readJson(request);
    sendJson(response, 200, {
      skill: await deleteSkillAction({
        skill: String(body.skill ?? "")
      }, cwd)
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/profiles") {
    const body = await readJson(request);
    sendJson(response, 200, {
      profile: await saveProfileAction({
        name: String(body.name ?? ""),
        skills: Array.isArray(body.skills) ? body.skills.map(String) : String(body.skills ?? "").split(","),
        agent: body.agent ? parseAgent(body.agent) : undefined
      }, cwd)
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/profiles/apply") {
    const body = await readJson(request);
    sendJson(response, 200, {
      installed: await applyProfileAction({
        name: String(body.name ?? ""),
        agent: body.agent ? parseAgent(body.agent) : undefined,
        scope: parseScope(body.scope),
        targetRoot: optionalString(body.targetRoot)
      }, cwd)
    });
    return;
  }

  sendJson(response, 404, { error: "API route not found." });
}

async function serveStatic(pathname: string, response: ServerResponse, webRoot: string) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const fullPath = path.resolve(webRoot, `.${decodeURIComponent(requestedPath)}`);
  const root = path.resolve(webRoot);
  const relative = path.relative(root, fullPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = await fs.readFile(fullPath);
    response.writeHead(200, {
      "content-type": contentType(fullPath)
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(body));
}

function parseAgent(value: unknown): AgentId {
  if (AGENTS.includes(value as AgentId)) {
    return value as AgentId;
  }
  throw new Error(`Unsupported agent "${String(value)}".`);
}

function parseScope(value: unknown): SkillScope {
  if (value === "user" || value === "project") {
    return value;
  }
  throw new Error(`Unsupported scope "${String(value)}".`);
}

function parseAgents(value: unknown): AgentId[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map(parseAgent);
}

function parseStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return String(value ?? "").split(",");
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function contentType(filePath: string): string {
  switch (path.extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url } = await startStudioServer();
  console.log(`Skill Management Studio running at ${url}`);
}
