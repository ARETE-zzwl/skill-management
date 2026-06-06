import fs from "node:fs/promises";
import path from "node:path";
import type {
  SecurityFinding,
  SecurityRiskLevel,
  SecurityScan,
  SkillManifest
} from "./types.js";

const MAX_SCAN_BYTES = 200_000;

const SCANNED_EXTENSIONS = new Set([
  ".js",
  ".ts",
  ".mjs",
  ".cjs",
  ".py",
  ".sh",
  ".bash",
  ".zsh",
  ".ps1",
  ".cmd",
  ".bat",
  ".md"
]);

const RULES: Array<{
  id: string;
  title: string;
  severity: Exclude<SecurityRiskLevel, "none">;
  pattern: RegExp;
  detail: string;
}> = [
  {
    id: "destructive-delete",
    title: "可能的递归删除",
    severity: "high",
    pattern: /\brm\s+-rf\b|Remove-Item\b[\s\S]{0,80}-Recurse|\bdel\s+\/s\b|\brmdir\s+\/s\b/i,
    detail: "发现递归删除命令，安装或运行前需要人工审查脚本作用范围。"
  },
  {
    id: "sensitive-path",
    title: "敏感路径访问",
    severity: "high",
    pattern: /\.ssh|id_rsa|\/etc\/|C:\\Windows|AppData\\Roaming/i,
    detail: "发现敏感系统或凭据路径引用，需要确认是否必要。"
  },
  {
    id: "process-exec",
    title: "进程执行",
    severity: "medium",
    pattern: /child_process|execSync|spawn\(|subprocess\.|os\.system|Runtime\.getRuntime/i,
    detail: "发现进程执行 API，可能会运行外部命令。"
  },
  {
    id: "network-download",
    title: "网络请求或下载",
    severity: "medium",
    pattern: /\bcurl\b|\bwget\b|Invoke-WebRequest|Invoke-RestMethod|fetch\(['"]https?:|requests\.(get|post)|axios\./i,
    detail: "发现网络访问模式，运行时可能依赖外部资源。"
  },
  {
    id: "package-install",
    title: "安装依赖",
    severity: "medium",
    pattern: /\bnpm\s+install\b|\bpip\s+install\b|\bpnpm\s+add\b|\byarn\s+add\b|\buv\s+add\b/i,
    detail: "发现依赖安装命令，可能改变本地环境。"
  },
  {
    id: "env-access",
    title: "环境变量访问",
    severity: "low",
    pattern: /process\.env|os\.environ|\$env:/i,
    detail: "发现环境变量读取，确认不会暴露敏感信息。"
  }
];

export async function scanSkillSecurity(skill: SkillManifest): Promise<SecurityScan> {
  const scannedFiles = filesToScan(skill);
  const findings: SecurityFinding[] = [];

  for (const relativeFile of scannedFiles) {
    const fullPath = path.join(skill.sourcePath, relativeFile);
    const content = await readLimited(fullPath);
    if (content === undefined) {
      continue;
    }

    for (const rule of RULES) {
      if (rule.pattern.test(content)) {
        findings.push({
          id: rule.id,
          title: rule.title,
          severity: rule.severity,
          file: relativeFile,
          detail: rule.detail
        });
      }
    }
  }

  if (skill.files.some((file) => file.startsWith("scripts/")) && findings.length === 0) {
    findings.push({
      id: "script-present",
      title: "包含脚本",
      severity: "low",
      file: "scripts/",
      detail: "该 skill 包含脚本目录，运行前建议查看脚本内容。"
    });
  }

  const riskLevel = highestRisk(findings);
  return {
    riskLevel,
    summary: summaryFor(riskLevel, findings.length),
    scannedFiles,
    findings
  };
}

function filesToScan(skill: SkillManifest): string[] {
  return skill.files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return file === "SKILL.md" || file.startsWith("scripts/") || SCANNED_EXTENSIONS.has(ext);
  });
}

async function readLimited(filePath: string): Promise<string | undefined> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size > MAX_SCAN_BYTES) {
      return undefined;
    }
    return fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function highestRisk(findings: SecurityFinding[]): SecurityRiskLevel {
  if (findings.some((finding) => finding.severity === "high")) {
    return "high";
  }
  if (findings.some((finding) => finding.severity === "medium")) {
    return "medium";
  }
  if (findings.some((finding) => finding.severity === "low")) {
    return "low";
  }
  return "none";
}

function summaryFor(riskLevel: SecurityRiskLevel, count: number): string {
  if (riskLevel === "none") {
    return "未发现脚本风险信号。";
  }
  return `发现 ${count} 个${riskLabel(riskLevel)}风险信号。`;
}

function riskLabel(riskLevel: SecurityRiskLevel): string {
  switch (riskLevel) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
    default:
      return "无";
  }
}
