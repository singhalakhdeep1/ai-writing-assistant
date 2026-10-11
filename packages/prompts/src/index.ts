import type { WritingAction, WritingContext } from "@awa/types";

/** Prompt template for a writing action. */
export interface PromptTemplate {
  action: WritingAction;
  system: string;
  userPrefix: string;
}

/** Hostname → writing context mapping (Module 10). */
export const CONTEXT_HOSTNAMES: Record<WritingContext, string[]> = {
  email: ["mail.google.com", "outlook.live.com", "outlook.office.com"],
  social: ["www.linkedin.com", "twitter.com", "x.com", "www.facebook.com", "app.slack.com"],
  blog: ["medium.com", "www.notion.so", "substack.com", "wordpress.com"],
  code: ["github.com", "gitlab.com", "stackoverflow.com"],
  resume: ["www.linkedin.com", "www.indeed.com", "jobs.lever.co"],
  general: [],
};

/** Context-specific system prompt additions (Module 10). */
export const CONTEXT_PROMPTS: Record<WritingContext, string> = {
  email: "The user is writing an email. Preserve appropriate salutations and sign-offs.",
  social: "The user is writing a social media post. Keep it concise and engaging.",
  blog: "The user is writing long-form content. Maintain narrative flow and readability.",
  code: "The user is writing technical documentation or commit messages. Be precise and clear.",
  resume: "The user is writing professional career content. Use strong action verbs.",
  general: "Adapt to the user's writing style while improving clarity.",
};

/** Built-in prompt templates (Module 5). */
export const PROMPT_TEMPLATES: Record<WritingAction, PromptTemplate> = {
  grammar: {
    action: "grammar",
    system:
      "You are a grammar expert. Fix grammar and spelling errors. Return only the corrected text.",
    userPrefix: "Fix the grammar in this text:\n\n",
  },
  "tone-formal": {
    action: "tone-formal",
    system: "Rewrite the text in a formal, professional tone. Return only the rewritten text.",
    userPrefix: "Make this text formal:\n\n",
  },
  "tone-friendly": {
    action: "tone-friendly",
    system: "Rewrite the text in a friendly, casual tone. Return only the rewritten text.",
    userPrefix: "Make this text friendly:\n\n",
  },
  rewrite: {
    action: "rewrite",
    system: "Rewrite the text to improve clarity and flow. Return only the rewritten text.",
    userPrefix: "Rewrite this text:\n\n",
  },
  summarize: {
    action: "summarize",
    system: "Summarize the text concisely. Return only the summary.",
    userPrefix: "Summarize this text:\n\n",
  },
  translate: {
    action: "translate",
    system: "Translate the text to English. Return only the translation.",
    userPrefix: "Translate this text:\n\n",
  },
  expand: {
    action: "expand",
    system: "Expand the text with more detail. Return only the expanded text.",
    userPrefix: "Expand this text:\n\n",
  },
  shorten: {
    action: "shorten",
    system: "Shorten the text while preserving meaning. Return only the shortened text.",
    userPrefix: "Shorten this text:\n\n",
  },
  explain: {
    action: "explain",
    system:
      "You are a writing coach. Given an original text and a suggested revision, explain in 2-4 short bullet points why the changes improve the text (grammar rule, clarity, tone). Do not rewrite the text.",
    userPrefix: "",
  },
  custom: {
    action: "custom",
    system: "Follow the user's instructions precisely. Return only the result.",
    userPrefix: "",
  },
};

/** Infers writing context from hostname (Module 10). */
export function inferWritingContext(hostname: string): WritingContext {
  const host = hostname.toLowerCase();
  for (const [context, hosts] of Object.entries(CONTEXT_HOSTNAMES) as [
    WritingContext,
    string[],
  ][]) {
    if (context === "general") continue;
    if (hosts.some((h) => host === h || host.endsWith(`.${h}`))) return context;
  }
  return "general";
}

/** Builds a complete prompt from action and text (Module 5). */
export function buildPrompt(
  action: WritingAction,
  text: string,
  customPrompt?: string,
): { system: string; user: string } {
  const template = PROMPT_TEMPLATES[action];
  return {
    system: template.system,
    user: customPrompt ?? `${template.userPrefix}${text}`,
  };
}

/** Builds a context-aware prompt (Modules 5 & 10). */
export function buildPromptWithContext(
  action: WritingAction,
  text: string,
  hostname: string,
  customPrompt?: string,
): { system: string; user: string; context: WritingContext } {
  const context = inferWritingContext(hostname);
  const base = buildPrompt(action, text, customPrompt);
  const contextHint = CONTEXT_PROMPTS[context];

  return {
    context,
    system: `${base.system}\n\nContext: ${contextHint}`,
    user: base.user,
  };
}
