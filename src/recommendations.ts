import type { ProfileRecommendation, RegistrySkill } from "./types.js";

const TOPIC_RULES: Array<{
  name: string;
  labels: string[];
  reason: string;
}> = [
  {
    name: "documents",
    labels: ["doc", "docs", "document", "documents", "pdf", "pptx", "docx", "xlsx", "spreadsheet"],
    reason: "Document-heavy skills are grouped for report, PDF, deck, and spreadsheet work."
  },
  {
    name: "frontend",
    labels: ["frontend", "ui", "browser", "web", "react", "design"],
    reason: "Frontend skills are grouped for interface implementation and browser verification."
  },
  {
    name: "engineering",
    labels: ["testing", "debugging", "api", "security", "performance", "git"],
    reason: "Engineering workflow skills are grouped for coding, review, and release tasks."
  }
];

export function recommendProfiles(skills: RegistrySkill[]): ProfileRecommendation[] {
  const recommendations: ProfileRecommendation[] = [];

  for (const rule of TOPIC_RULES) {
    const matchingSkills = skills
      .filter((skill) => labelsFor(skill).some((label) => rule.labels.includes(label)))
      .map((skill) => skill.slug)
      .sort();

    if (matchingSkills.length >= 2) {
      recommendations.push({
        name: rule.name,
        skills: matchingSkills,
        reason: rule.reason
      });
    }
  }

  return recommendations;
}

function labelsFor(skill: RegistrySkill): string[] {
  return [...skill.tags, ...skill.triggers, skill.slug]
    .flatMap((label) => label.split(/[-_.]/g))
    .map((label) => label.toLowerCase())
    .filter(Boolean);
}
