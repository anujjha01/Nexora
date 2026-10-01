const routes = [
  { agent: "imageGen", patterns: [/\b(create|generate|draw|make|edit)\b.{0,45}\b(image|picture|illustration|artwork|photo)\b/i, /\b(image|picture|illustration)\b.{0,35}\b(of|for)\b/i] },
  { agent: "ppt", patterns: [/\b(create|make|build|generate)\b.{0,40}\b(presentation|slides?|pptx?)\b/i, /\b(presentation|slides?|pptx?)\b.{0,30}\b(about|on|for)\b/i] },
  { agent: "pdf", patterns: [/\b(uploaded|attached|this|the)\s+(pdf|document|file)\b/i, /\b(summarize|compare|analyze|extract)\b.{0,35}\b(pdf|document|file)\b/i] },
  { agent: "coding", patterns: [/\b(debug|refactor|fix|write|generate|review|explain)\b.{0,35}\b(code|function|script|program|typescript|javascript|python|sql)\b/i, /\b(code|typescript|javascript|python|sql)\b.{0,30}\b(error|bug|issue|fails?)\b/i, /\b(build|create|make|generate|design)\b.{0,55}\b(react|next(?:\.js)?|vue|svelte|website|web\s*app|frontend|landing\s*page|component|dashboard|portfolio|UI|app|project|page|site|calculator|game|widget|tool|todo(?:-list)?|to-do(?:-list)?)\b/i, /\b(react|next(?:\.js)?|vue|svelte|html|css|javascript|js)\b.{0,45}\b(app|website|page|component|UI|project|site|calculator|game|widget|tool|todo(?:-list)?|to-do(?:-list)?)\b/i, /\b(build|create|make|generate)\b.{0,40}\b(simple|basic|small|responsive)\b.{0,35}\b(app|website|page|project|site|UI|calculator|game|widget|tool|todo(?:-list)?|to-do(?:-list)?)\b/i] },
  { agent: "search", patterns: [/\b(latest|current|recent|today|yesterday|this week|news|right now|as of \d{4})\b/i, /\b(search the web|look online|browse the web|web search)\b/i] },
];

const agentAliases = new Map([["auto", "auto"], ["chat", "chat"], ["search", "search"], ["coding", "coding"], ["pdf", "pdf"], ["ppt", "ppt"], ["imagegen", "imageGen"]]);

// Auto mode uses predictable intent rules for clear specialist requests and
// falls back to chat. It does not spend an extra model call pretending to plan.
const router = async (state) => {
  const requestedAgent = agentAliases.get(String(state.agent || "auto").toLowerCase()) || "auto";
  if (requestedAgent !== "auto") return { ...state, agent: requestedAgent };

  const prompt = state.prompt || "";
  if (Array.isArray(state.documentIds) && state.documentIds.length > 0) {
    const requestsPresentation = routes.find(({ agent }) => agent === "ppt").patterns.some((pattern) => pattern.test(prompt));
    return { ...state, agent: requestsPresentation ? "ppt" : "pdf" };
  }
  const match = routes.find(({ patterns }) => patterns.some((pattern) => pattern.test(prompt)));
  return { ...state, agent: match?.agent || "chat" };
};

export default router;
