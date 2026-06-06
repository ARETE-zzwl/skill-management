export const AGENTS = ["codex", "claude-code"] as const;

export type AgentId = (typeof AGENTS)[number];

export type SkillScope = "user" | "project";

export interface SkillManifest {
  name: string;
  description: string;
  version?: string;
  tags: string[];
  triggers: string[];
  agents: AgentId[];
  sourcePath: string;
  skillFile: string;
  slug: string;
  instructions: string;
  files: string[];
}

export interface SkillValidationResult {
  ok: boolean;
  skill?: SkillManifest;
  errors: string[];
  warnings: string[];
}

export interface RegistrySkill extends SkillManifest {
  importedAt: string;
  source: string;
}

export interface Profile {
  name: string;
  skills: string[];
  agent?: AgentId;
  updatedAt: string;
}

export interface RegistryData {
  skills: RegistrySkill[];
  profiles: Profile[];
}

export interface SkillConflict {
  type: "name" | "trigger";
  severity: "error" | "warning";
  message: string;
  skills: string[];
}

export interface InstalledSkillRoot {
  agent: AgentId;
  scope: SkillScope;
  path: string;
  skills: SkillManifest[];
}

export interface ProfileRecommendation {
  name: string;
  skills: string[];
  reason: string;
}

export type SecurityRiskLevel = "none" | "low" | "medium" | "high";

export interface SecurityFinding {
  id: string;
  title: string;
  severity: Exclude<SecurityRiskLevel, "none">;
  file: string;
  detail: string;
}

export interface SecurityScan {
  riskLevel: SecurityRiskLevel;
  summary: string;
  scannedFiles: string[];
  findings: SecurityFinding[];
}

export interface CompatibilityCell {
  agent: AgentId;
  supported: boolean;
  callable: boolean;
  installedScopes: SkillScope[];
  status: "unsupported" | "supported" | "installed";
  note: string;
}

export interface SkillInsight {
  slug: string;
  callableAgents: AgentId[];
  compatibility: CompatibilityCell[];
  security: SecurityScan;
  invocationExamples: string[];
}

export interface ProfileTemplate {
  id: string;
  title: string;
  description: string;
  skills: string[];
  tags: string[];
  agent?: AgentId;
}

export interface CatalogSkill {
  id: string;
  name: string;
  title: string;
  description: string;
  source: string;
  subdir?: string;
  repository: string;
  category: string;
  tags: string[];
  agents: AgentId[];
  featuredReason: string;
  examplePrompt: string;
}

export interface AppState {
  registrySkills: RegistrySkill[];
  profiles: Profile[];
  conflicts: SkillConflict[];
  installedRoots: InstalledSkillRoot[];
  recommendations: ProfileRecommendation[];
  catalog: CatalogSkill[];
  skillInsights: SkillInsight[];
  profileTemplates: ProfileTemplate[];
  agentRoots: Array<{
    agent: AgentId;
    scope: SkillScope;
    path: string;
  }>;
}
