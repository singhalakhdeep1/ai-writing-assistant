import { describe, expect, it } from "vitest";
import { inferWritingContext, buildPromptWithContext, buildPrompt } from "./index.js";

describe("@awa/prompts", () => {
  it("infers email context from Gmail", () => {
    expect(inferWritingContext("mail.google.com")).toBe("email");
  });

  it("infers social context from LinkedIn", () => {
    expect(inferWritingContext("www.linkedin.com")).toBe("social");
  });

  it("infers code context from GitHub", () => {
    expect(inferWritingContext("github.com")).toBe("code");
  });

  it("defaults to general context", () => {
    expect(inferWritingContext("unknown-site.com")).toBe("general");
  });

  it("builds context-aware prompts (Module 10)", () => {
    const { system, context } = buildPromptWithContext("grammar", "Hello world", "mail.google.com");
    expect(context).toBe("email");
    expect(system).toContain("email");
  });

  it("builds basic prompts (Module 5)", () => {
    const { system, user } = buildPrompt("grammar", "teh cat");
    expect(system).toContain("grammar");
    expect(user).toContain("teh cat");
  });
});
