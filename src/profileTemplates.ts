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
    skills: ["web-design-guidelines", "react-best-practices", "frontend-design", "webapp-testing"],
    tags: ["frontend", "react", "ui"]
  },
  {
    id: "document-workbench",
    title: "文档处理",
    description: "PDF、Word、PPT、表格和文档协作相关 skill 组合。",
    skills: ["pdf", "docx", "pptx", "xlsx", "doc-coauthoring"],
    tags: ["document", "pdf", "office"]
  }
];
