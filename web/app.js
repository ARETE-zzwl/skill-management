const state = {
  data: null,
  busy: false,
  query: "",
  selectedSkills: new Set()
};

const STARTER_PACK_IDS = [
  "nature-writing",
  "vercel-react-best-practices",
  "anthropic-webapp-testing",
  "anthropic-doc-coauthoring",
  "mattpocock-tdd",
  "mattpocock-diagnose",
  "mattpocock-handoff",
  "microsoft-docs",
  "apify-ultimate-scraper"
];

const nodes = {
  status: document.querySelector("#status"),
  refreshButton: document.querySelector("#refresh-button"),
  importForm: document.querySelector("#import-form"),
  profileForm: document.querySelector("#profile-form"),
  installScope: document.querySelector("#install-scope"),
  searchInput: document.querySelector("#search-input"),
  catalogList: document.querySelector("#catalog-list"),
  skillsList: document.querySelector("#skills-list"),
  conflictList: document.querySelector("#conflict-list"),
  templateList: document.querySelector("#template-list"),
  profileList: document.querySelector("#profile-list"),
  recommendations: document.querySelector("#recommendations"),
  rootsList: document.querySelector("#roots-list"),
  metricSkills: document.querySelector("#metric-skills"),
  metricInstalled: document.querySelector("#metric-installed"),
  metricConflicts: document.querySelector("#metric-conflicts"),
  metricCatalog: document.querySelector("#metric-catalog"),
  dialog: document.querySelector("#skill-dialog"),
  skillDetail: document.querySelector("#skill-detail")
};

nodes.refreshButton.addEventListener("click", () => loadState());
nodes.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value.trim().toLowerCase();
  render();
});

document.addEventListener("change", (event) => {
  const checkbox = event.target.closest(".skill-select");
  if (!checkbox) {
    return;
  }

  if (checkbox.checked) {
    state.selectedSkills.add(checkbox.value);
  } else {
    state.selectedSkills.delete(checkbox.value);
  }
  renderSkillManagementBar();
});

nodes.importForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const source = document.querySelector("#import-source").value.trim();
  const subdir = document.querySelector("#import-subdir").value.trim();

  await runAction("正在导入 Skill", async () => {
    await postJson("/api/import", { source, subdir });
    document.querySelector("#import-source").value = "";
    document.querySelector("#import-subdir").value = "";
  });
});

nodes.profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.querySelector("#profile-name").value.trim();
  const skills = document.querySelector("#profile-skills").value.split(",").map((skill) => skill.trim()).filter(Boolean);
  const agent = document.querySelector("#profile-agent").value || undefined;

  await runAction("正在保存组合", async () => {
    await postJson("/api/profiles", { name, skills, agent });
  });
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  if (button.classList.contains("prompt-copy")) {
    await copyPrompt(button.dataset.copy || "");
    return;
  }

  const action = button.dataset.action;

  if (action === "import-catalog") {
    await runAction("正在从精选库导入", async () => {
      await postJson("/api/catalog/import", { id: button.dataset.id });
    });
  }

  if (action === "import-install-catalog") {
    await runAction("正在导入并共享安装", async () => {
      await postJson("/api/catalog/import-install", {
        id: button.dataset.id,
        scope: nodes.installScope.value
      });
    });
  }

  if (action === "install-starter-pack") {
    await runAction("正在导入推荐开箱包", async () => {
      for (const id of STARTER_PACK_IDS) {
        await postJson("/api/catalog/import-install", {
          id,
          scope: nodes.installScope.value
        });
      }
    });
  }

  if (action === "install") {
    await runAction("正在安装", async () => {
      await postJson("/api/install", {
        skill: button.dataset.skill,
        agent: button.dataset.agent,
        scope: nodes.installScope.value
      });
    });
  }

  if (action === "install-shared") {
    await runAction("正在共享安装", async () => {
      await postJson("/api/install/shared", {
        skill: button.dataset.skill,
        scope: nodes.installScope.value
      });
    });
  }

  if (action === "select-visible-skills") {
    document.querySelectorAll(".skill-select").forEach((checkbox) => {
      state.selectedSkills.add(checkbox.value);
    });
    render();
  }

  if (action === "clear-selection") {
    state.selectedSkills.clear();
    render();
  }

  if (action === "bulk-install-shared") {
    const skills = selectedSkills();
    await runAction("正在批量共享安装", async () => {
      await postJson("/api/install/shared-bulk", {
        skills,
        scope: nodes.installScope.value
      });
    });
  }

  if (action === "save-selected-profile") {
    const skills = selectedSkills();
    const defaultName = skills.length === 1 ? `${skills[0]}-profile` : `skill-set-${skills.length}`;
    const name = window.prompt("组合名称", defaultName);
    if (!name) {
      return;
    }

    await runAction("正在保存选中组合", async () => {
      await postJson("/api/profiles", { name, skills });
    });
  }

  if (action === "delete-selected-skills") {
    const skills = selectedSkills();
    if (!window.confirm(`从管理库移除 ${skills.length} 个 skill？已安装到 agent 目录的副本不会被删除。`)) {
      return;
    }

    await runAction("正在从管理库移除", async () => {
      for (const skill of skills) {
        await postJson("/api/skills/delete", { skill });
        state.selectedSkills.delete(skill);
      }
    });
  }

  if (action === "details") {
    const skill = state.data.registrySkills.find((item) => item.slug === button.dataset.skill);
    if (skill) {
      openSkillDetail(skill);
    }
  }

  if (action === "save-template") {
    const template = state.data.profileTemplates.find((item) => item.id === button.dataset.template);
    if (!template) {
      return;
    }

    await runAction("正在保存预设组合", async () => {
      await postJson("/api/profiles", {
        name: template.id,
        skills: template.skills,
        agent: template.agent
      });
    });
  }

  if (action === "catalog-details") {
    const item = state.data.catalog.find((catalogSkill) => catalogSkill.id === button.dataset.id);
    if (item) {
      openCatalogDetail(item);
    }
  }

  if (action === "apply-profile") {
    await runAction("正在应用组合", async () => {
      await postJson("/api/profiles/apply", {
        name: button.dataset.profile,
        agent: button.dataset.agent || undefined,
        scope: nodes.installScope.value
      });
    });
  }

  if (action === "save-recommendation") {
    const recommendation = state.data.recommendations.find((item) => item.name === button.dataset.profile);
    if (!recommendation) {
      return;
    }

    await runAction("正在保存推荐组合", async () => {
      await postJson("/api/profiles", {
        name: recommendation.name,
        skills: recommendation.skills
      });
    });
  }

});

await loadState();

async function loadState() {
  setBusy(true);
  try {
    state.data = await getJson("/api/state");
    render();
    setStatus("状态已刷新。", "success");
  } catch (error) {
    setStatus(messageFor(error), "error");
  } finally {
    setBusy(false);
  }
}

async function runAction(label, action) {
  setBusy(true);
  setStatus(`${label}...`, "");
  try {
    await action();
    await loadState();
    setStatus(`${label}完成。`, "success");
  } catch (error) {
    setStatus(messageFor(error), "error");
  } finally {
    setBusy(false);
  }
}

function render() {
  if (!state.data) {
    return;
  }

  const data = state.data;
  const installedCount = data.installedRoots.reduce((total, root) => total + root.skills.length, 0);
  const registrySlugs = new Set(data.registrySkills.map((skill) => skill.slug));
  state.selectedSkills = new Set([...state.selectedSkills].filter((slug) => registrySlugs.has(slug)));
  nodes.metricSkills.textContent = String(data.registrySkills.length);
  nodes.metricInstalled.textContent = String(installedCount);
  nodes.metricConflicts.textContent = String(data.conflicts.length);
  nodes.metricCatalog.textContent = String(data.catalog.length);

  renderCatalog(filterItems(data.catalog));
  renderSkills(filterItems(data.registrySkills));
  renderConflicts(data.conflicts);
  renderTemplates(data.profileTemplates);
  renderProfiles(data.profiles);
  renderRecommendations(data.recommendations);
  renderRoots(data.installedRoots);
}

function renderCatalog(items) {
  if (items.length === 0) {
    nodes.catalogList.innerHTML = `<div class="empty-state">没有匹配的精选 Skill。</div>`;
    return;
  }

  nodes.catalogList.innerHTML = items.map((item) => {
    const imported = state.data.registrySkills.some((skill) => skill.slug === item.name || skill.name === item.name);
    return `
      <article class="catalog-card">
        <header>
          <div>
            <span class="pill blue">${escapeHtml(item.category)}</span>
            <h4>${escapeHtml(item.title)}</h4>
          </div>
          ${imported ? `<span class="pill green">已导入</span>` : `<span class="pill">未导入</span>`}
        </header>
        <p>${escapeHtml(item.description)}</p>
        <div class="pill-list">${pills(item.tags, "amber")}</div>
        <p>${escapeHtml(item.featuredReason)}</p>
        <div class="catalog-actions">
          <button type="button" data-action="catalog-details" data-id="${escapeAttr(item.id)}">示例</button>
          <button type="button" data-action="import-catalog" data-id="${escapeAttr(item.id)}" ${imported ? "disabled" : ""}>下载导入</button>
          <button type="button" data-action="import-install-catalog" data-id="${escapeAttr(item.id)}">导入并共享安装</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderSkills(skills) {
  if (skills.length === 0) {
    nodes.skillsList.innerHTML = `<div class="empty-state">还没有导入 Skill。可以从精选库下载，也可以粘贴 GitHub tree URL。</div>`;
    return;
  }

  nodes.skillsList.innerHTML = `
    <div class="management-bar" data-management-bar>
      <div>
        <strong>已选 <span data-selected-count>0</span> 个</strong>
        <span>导入后只是进入管理库；共享安装后，新会话中的 agent 才能按示例调用。</span>
      </div>
      <div class="management-actions">
        <button type="button" class="secondary" data-action="select-visible-skills">全选当前</button>
        <button type="button" class="secondary" data-action="clear-selection">清空</button>
        <button type="button" data-bulk-action data-action="bulk-install-shared">批量共享安装</button>
        <button type="button" data-bulk-action class="secondary" data-action="save-selected-profile">保存为组合</button>
        <button type="button" data-bulk-action class="danger" data-action="delete-selected-skills">移除</button>
      </div>
    </div>
    ${skills.map((skill) => {
    const codexDisabled = skill.agents.includes("codex") ? "" : "disabled";
    const claudeDisabled = skill.agents.includes("claude-code") ? "" : "disabled";
    const insight = insightFor(skill.slug);
    const riskTone = riskToneFor(insight?.security.riskLevel || "none");
    const checked = state.selectedSkills.has(skill.slug) ? "checked" : "";
    return `
      <article class="skill-row">
        <label class="row-check" aria-label="选择 ${escapeAttr(skill.name)}">
          <input class="skill-select" type="checkbox" value="${escapeAttr(skill.slug)}" ${checked} />
        </label>
        <div class="skill-main">
          <header>
            <h4>${escapeHtml(skill.name)}</h4>
            <span class="pill ${escapeAttr(riskTone)}">${escapeHtml(riskLabel(insight?.security.riskLevel || "none"))}</span>
          </header>
          <p>${escapeHtml(skill.description)}</p>
          <small>${escapeHtml(skill.sourcePath)}</small>
        </div>
        <div class="pill-list">${pills(skill.agents, "green")}</div>
        <div class="pill-list">${callabilityPills(insight)}${pills(skill.triggers)}</div>
        <div class="row-actions">
          <button type="button" class="secondary" data-action="details" data-skill="${escapeAttr(skill.slug)}">说明</button>
          <button type="button" data-action="install" data-skill="${escapeAttr(skill.slug)}" data-agent="codex" ${codexDisabled}>Codex</button>
          <button type="button" data-action="install" data-skill="${escapeAttr(skill.slug)}" data-agent="claude-code" ${claudeDisabled}>Claude</button>
          <button type="button" data-action="install-shared" data-skill="${escapeAttr(skill.slug)}">共享</button>
        </div>
      </article>
    `;
  }).join("")}
  `;
  renderSkillManagementBar();
}

function renderConflicts(conflicts) {
  if (conflicts.length === 0) {
    nodes.conflictList.innerHTML = `<div class="empty-state">当前没有检测到名称或触发词冲突。</div>`;
    return;
  }

  nodes.conflictList.innerHTML = conflicts.map((conflict) => `
    <article class="conflict-item">
      <div class="conflict-title">
        <strong>${escapeHtml(conflict.type)}</strong>
        <span class="severity ${escapeAttr(conflict.severity)}">${escapeHtml(conflict.severity)}</span>
      </div>
      <p>${escapeHtml(conflict.message)}</p>
      <div class="pill-list">${pills(conflict.skills, "amber")}</div>
    </article>
  `).join("");
}

function renderTemplates(templates) {
  if (templates.length === 0) {
    nodes.templateList.innerHTML = "";
    return;
  }

  nodes.templateList.innerHTML = templates.map((template) => `
    <article class="template-item">
      <div class="template-title">
        <strong>${escapeHtml(template.title)}</strong>
        <button type="button" class="secondary" data-action="save-template" data-template="${escapeAttr(template.id)}">保存预设</button>
      </div>
      <p>${escapeHtml(template.description)}</p>
      <div class="pill-list">${pills(template.skills, "blue")}</div>
    </article>
  `).join("");
}

function renderProfiles(profiles) {
  if (profiles.length === 0) {
    nodes.profileList.innerHTML = `<div class="empty-state">还没有保存组合。</div>`;
    return;
  }

  nodes.profileList.innerHTML = profiles.map((profile) => `
    <article class="profile-item">
      <div class="profile-title">
        <strong>${escapeHtml(profile.name)}</strong>
        ${profile.agent ? `<span class="pill green">${escapeHtml(profile.agent)}</span>` : `<span class="pill">任意 agent</span>`}
      </div>
      <div class="pill-list">${pills(profile.skills)}</div>
      <div class="profile-actions">
        <button type="button" class="secondary" data-action="apply-profile" data-profile="${escapeAttr(profile.name)}" data-agent="${escapeAttr(profile.agent || "")}">应用</button>
      </div>
    </article>
  `).join("");
}

function renderRecommendations(recommendations) {
  if (recommendations.length === 0) {
    nodes.recommendations.innerHTML = "";
    return;
  }

  nodes.recommendations.innerHTML = recommendations.map((recommendation) => `
    <article class="recommendation-item">
      <div class="recommendation-title">
        <strong>推荐：${escapeHtml(recommendation.name)}</strong>
        <button type="button" class="secondary" data-action="save-recommendation" data-profile="${escapeAttr(recommendation.name)}">保存</button>
      </div>
      <p>${escapeHtml(recommendation.reason)}</p>
      <div class="pill-list">${pills(recommendation.skills)}</div>
    </article>
  `).join("");
}

function renderRoots(roots) {
  nodes.rootsList.innerHTML = roots.map((root) => `
    <article class="root-item">
      <div class="root-title">
        <strong>${escapeHtml(agentLabel(root.agent))}</strong>
        <span class="pill">${escapeHtml(scopeLabel(root.scope))}</span>
      </div>
      <code>${escapeHtml(root.path)}</code>
      <div class="pill-list">${pills(root.skills.map((skill) => skill.slug), "green")}</div>
    </article>
  `).join("");
}

function openSkillDetail(skill) {
  const insight = insightFor(skill.slug);
  nodes.skillDetail.innerHTML = `
    <article class="detail">
      <header class="detail-header">
        <p class="kicker">SKILL.md</p>
        <h3>${escapeHtml(skill.name)}</h3>
        <p>${escapeHtml(skill.description)}</p>
        <div class="pill-list">${pills(skill.agents, "green")}${pills(skill.triggers, "blue")}</div>
      </header>
      <div class="detail-body">
        <section>
          <strong>调用示例</strong>
          <div class="example-list">${(insight?.invocationExamples || []).map((example) => `
            <div class="example-row">
              <code>${escapeHtml(example)}</code>
              <button type="button" class="secondary prompt-copy" data-copy="${escapeAttr(example)}">复制</button>
            </div>
          `).join("")}</div>
        </section>
        <section>
          <strong>兼容性矩阵</strong>
          ${compatibilityTable(insight)}
        </section>
        <section>
          <strong>安全扫描</strong>
          ${securitySummary(insight)}
        </section>
        <section>
          <strong>使用说明</strong>
          <div class="markdown">${markdownToHtml(skill.instructions || "这个 Skill 没有正文说明。")}</div>
        </section>
        <section>
          <strong>包含文件</strong>
          <div class="file-list">${pills(skill.files || [])}</div>
        </section>
        <section>
          <strong>来源路径</strong>
          <p class="path-text">${escapeHtml(skill.sourcePath)}</p>
        </section>
      </div>
    </article>
  `;
  nodes.dialog.showModal();
}

function compatibilityTable(insight) {
  if (!insight) {
    return `<div class="empty-state">暂无兼容性数据。</div>`;
  }

  return `
    <table class="compat-table">
      <thead>
        <tr>
          <th>Agent</th>
          <th>状态</th>
          <th>说明</th>
        </tr>
      </thead>
      <tbody>
        ${insight.compatibility.map((cell) => `
          <tr>
            <td>${escapeHtml(agentLabel(cell.agent))}</td>
            <td><span class="pill ${cell.status === "installed" ? "green" : cell.status === "supported" ? "blue" : "amber"}">${escapeHtml(compatStatusLabel(cell.status))}</span></td>
            <td>${escapeHtml(cell.note)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function securitySummary(insight) {
  if (!insight) {
    return `<div class="empty-state">暂无安全扫描数据。</div>`;
  }

  const security = insight.security;
  return `
    <div class="risk-card risk-${escapeAttr(security.riskLevel)}">
      <div class="template-title">
        <strong>${escapeHtml(riskLabel(security.riskLevel))}</strong>
        <span class="pill">${escapeHtml(security.scannedFiles.length)} 个文件已扫描</span>
      </div>
      <p>${escapeHtml(security.summary)}</p>
      ${security.findings.length === 0 ? "" : `
        <ul class="finding-list">
          ${security.findings.map((finding) => `
            <li>
              <strong>${escapeHtml(finding.title)}</strong>
              <span class="pill ${escapeAttr(riskToneFor(finding.severity))}">${escapeHtml(riskLabel(finding.severity))}</span>
              <span>${escapeHtml(finding.file)}：${escapeHtml(finding.detail)}</span>
            </li>
          `).join("")}
        </ul>
      `}
    </div>
  `;
}

function openCatalogDetail(item) {
  nodes.skillDetail.innerHTML = `
    <article class="detail">
      <header class="detail-header">
        <p class="kicker">精选源</p>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </header>
      <div class="detail-body">
        <section>
          <strong>推荐理由</strong>
          <p>${escapeHtml(item.featuredReason)}</p>
        </section>
        <section>
          <strong>显式调用示例</strong>
          <pre class="instruction-box">${escapeHtml(item.examplePrompt)}</pre>
        </section>
        <section>
          <strong>来源</strong>
          <p class="path-text">${escapeHtml(item.source)}</p>
        </section>
      </div>
    </article>
  `;
  nodes.dialog.showModal();
}

function filterItems(items) {
  if (!state.query) {
    return items;
  }

  return items.filter((item) => JSON.stringify(item).toLowerCase().includes(state.query));
}

function insightFor(slug) {
  return state.data?.skillInsights.find((insight) => insight.slug === slug);
}

function selectedSkills() {
  const skills = [...state.selectedSkills].filter((slug) => state.data.registrySkills.some((skill) => skill.slug === slug));
  if (skills.length === 0) {
    throw new Error("请先选择至少一个 skill。");
  }
  return skills;
}

function renderSkillManagementBar() {
  const bar = document.querySelector("[data-management-bar]");
  if (!bar) {
    return;
  }

  const count = selectedSkillsOrEmpty().length;
  const countNode = bar.querySelector("[data-selected-count]");
  if (countNode) {
    countNode.textContent = String(count);
  }
  bar.querySelectorAll("[data-bulk-action]").forEach((button) => {
    button.disabled = state.busy || count === 0;
  });
}

function selectedSkillsOrEmpty() {
  return [...state.selectedSkills].filter((slug) => state.data?.registrySkills.some((skill) => skill.slug === slug));
}

async function getJson(url) {
  const response = await fetch(url);
  return parseResponse(response);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return parseResponse(response);
}

async function parseResponse(response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `请求失败：${response.status}`);
  }
  return payload;
}

function setBusy(isBusy) {
  state.busy = isBusy;
  document.querySelectorAll("button, input, select").forEach((element) => {
    if (element.id === "install-scope") {
      return;
    }
    element.disabled = isBusy;
  });
}

function setStatus(message, type) {
  nodes.status.textContent = message;
  nodes.status.className = `status visible ${type}`.trim();
}

function messageFor(error) {
  return error instanceof Error ? error.message : String(error);
}

async function copyPrompt(text) {
  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus("示例提示词已复制，可以粘贴到 Codex 或 Claude Code 对话中。", "success");
  } catch {
    setStatus(`示例提示词：${text}`, "success");
  }
}

function pills(items, tone = "") {
  if (!items || items.length === 0) {
    return `<span class="pill">无</span>`;
  }
  return items.map((item) => `<span class="pill ${escapeAttr(tone)}">${escapeHtml(item)}</span>`).join("");
}

function agentLabel(agent) {
  return agent === "claude-code" ? "Claude Code" : "Codex";
}

function compatStatusLabel(status) {
  switch (status) {
    case "installed":
      return "可调用";
    case "supported":
      return "未安装";
    default:
      return "不支持";
  }
}

function callabilityPills(insight) {
  if (!insight || insight.callableAgents.length === 0) {
    return `<span class="pill amber">仅导入</span>`;
  }

  if (insight.callableAgents.length === 2) {
    return `<span class="pill green">双 agent 可调用</span>`;
  }

  return insight.callableAgents
    .map((agent) => `<span class="pill green">${escapeHtml(agentLabel(agent))} 可调用</span>`)
    .join("");
}

function riskLabel(level) {
  switch (level) {
    case "high":
      return "高风险";
    case "medium":
      return "中风险";
    case "low":
      return "低风险";
    default:
      return "无风险";
  }
}

function riskToneFor(level) {
  switch (level) {
    case "high":
      return "red";
    case "medium":
      return "amber";
    case "low":
      return "blue";
    default:
      return "green";
  }
}

function scopeLabel(scope) {
  return scope === "user" ? "全局用户" : "当前项目";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function markdownToHtml(markdown) {
  const lines = String(markdown).replaceAll("\r\n", "\n").split("\n");
  const html = [];
  let inCode = false;
  let codeLines = [];
  let inList = false;

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      html.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
      continue;
    }

    const listItem = line.match(/^\s*[-*]\s+(.+)$/);
    if (listItem) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(listItem[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  if (inCode) {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }
  closeList();
  return html.join("");

  function closeList() {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  }
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}
