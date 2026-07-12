import { describe, expect, it } from "vitest";
import { toSerializableField } from "./index";
import type { EditableField } from "@awa/types";

describe("@awa/editor-detection", () => {
  it("converts EditableField to serializable form", () => {
    const field: EditableField = {
      id: "field-1",
      type: "textarea",
      element: null,
      hostname: "example.com",
      label: "Message",
    };
    const serialized = toSerializableField(field);
    expect(serialized).toEqual({
      id: "field-1",
      type: "textarea",
      hostname: "example.com",
      label: "Message",
    });
    expect(serialized).not.toHaveProperty("element");
  });
});

describe("SITE_SELECTORS", () => {
  it("includes major platform selectors", async () => {
    const { SITE_SELECTORS } = await import("./index");
    expect(SITE_SELECTORS["mail.google.com"]).toBeDefined();
    expect(SITE_SELECTORS["github.com"]).toBeDefined();
    expect(SITE_SELECTORS["www.notion.so"]).toBeDefined();
  });
});
