import type { ProfileTemplate } from "./types.js";

export const PROFILE_TEMPLATES: ProfileTemplate[] = [
  {
    id: "nature-paper",
    title: "Nature 论文写作",
    description: "论文写作、润色、引文、图表和审稿回复的一组专业 skill。",
    skills: ["nature-writing", "nature-polishing", "nature-citation", "nature-figure", "nature-response"],
    tags: ["nature", "论文", "写作"]
  },
  {
    id: "frontend-dev",
    title: "前端开发",
    description: "UI 设计、React/Next 最佳实践、浏览器验证和前端工程工作流。",
    skills: [
      "frontend-design",
      "frontend-ui-engineering",
      "premium-frontend-ui",
      "gsap-framer-scroll-animation",
      "vercel-react-best-practices",
      "web-design-guidelines",
      "frontend-design-review",
      "webapp-testing",
      "browser-testing-with-devtools"
    ],
    tags: ["frontend", "react", "ui"]
  },
  {
    id: "engineering-quality",
    title: "Engineering Quality",
    description: "High-star workflow skills for scoped implementation, API boundaries, source-driven coding, documentation, and release readiness.",
    skills: [
      "using-agent-skills",
      "incremental-implementation",
      "api-and-interface-design",
      "source-driven-development",
      "documentation-and-adrs",
      "ci-cd-and-automation",
      "observability-and-instrumentation",
      "shipping-and-launch",
      "agentic-eval"
    ],
    tags: ["engineering", "workflow", "delivery"]
  },
  {
    id: "security-audit",
    title: "Security Audit",
    description: "Security, CodeQL, OWASP agent-risk, and supply-chain integrity skills for agent and application repositories.",
    skills: ["security-and-hardening", "codeql", "agent-owasp-compliance", "agent-supply-chain"],
    tags: ["security", "codeql", "owasp"]
  },
  {
    id: "web-quality",
    title: "Web Quality",
    description: "Lighthouse-style web quality, Core Web Vitals, accessibility, SEO, performance, and browser debugging skills.",
    skills: ["web-quality-audit", "core-web-vitals", "accessibility", "seo", "performance-optimization", "chrome-devtools"],
    tags: ["web", "performance", "accessibility"]
  },
  {
    id: "document-workbench",
    title: "文档处理",
    description: "PDF、Word、PPT、表格和文档协作相关 skill 组合。",
    skills: ["pdf", "docx", "pptx", "xlsx", "doc-coauthoring"],
    tags: ["document", "pdf", "office"]
  }
];
