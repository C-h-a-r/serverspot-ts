import { describe, expect, it } from "vitest";
import { evaluateExpression, escapeHtml, isTruthy } from "./expressions";
import { parseSpotTemplate } from "./parser";
import { renderSpotTemplate } from "./renderer";

describe("spot parser", () => {
  it("parses echo and text", () => {
    const doc = parseSpotTemplate("Hello {{ user.name }}!");
    expect(doc.nodes).toHaveLength(3);
    expect(doc.nodes[0]).toEqual({ type: "text", value: "Hello " });
    expect(doc.nodes[1]).toEqual({ type: "echo", expression: "user.name", raw: false });
  });

  it("parses @if blocks", () => {
    const doc = parseSpotTemplate("@if (user) yes @else no @endif");
    expect(doc.nodes[0]?.type).toBe("if");
  });

  it("parses @foreach", () => {
    const doc = parseSpotTemplate("@foreach (items as item) {{ item }} @endforeach");
    expect(doc.nodes[0]?.type).toBe("foreach");
  });
});

describe("spot renderer", () => {
  it("renders escaped output", () => {
    const html = renderSpotTemplate("{{ user.name }}", {
      context: { user: { name: "<script>" } },
      loadPartial: () => "",
    });
    expect(html).toBe("&lt;script&gt;");
  });

  it("renders conditionals", () => {
    const html = renderSpotTemplate("@if (user) hi @endif", {
      context: { user: { name: "Ada" } },
      loadPartial: () => "",
    });
    expect(html).toBe(" hi ");
  });

  it("renders foreach with limit", () => {
    const items = Array.from({ length: 300 }, (_, i) => i);
    const html = renderSpotTemplate("@foreach (items as n) {{ n }} @endforeach", {
      context: { items },
      loadPartial: () => "",
    });
    const count = html.trim().split(/\s+/).length;
    expect(count).toBeLessThanOrEqual(250);
  });

  it("includes partials", () => {
    const html = renderSpotTemplate("@include('header')", {
      context: {},
      loadPartial: (path) => (path === "header" ? "<header>OK</header>" : ""),
    });
    expect(html).toBe("<header>OK</header>");
  });
});

describe("expressions", () => {
  it("evaluates config()", () => {
    expect(evaluateExpression('config("accent")', { config: { accent: "#fff" } })).toBe("#fff");
  });

  it("evaluates comparisons", () => {
    expect(evaluateExpression("count > 0", { count: 5 })).toBe(true);
  });

  it("escapeHtml escapes tags", () => {
    expect(escapeHtml("<b>")).toBe("&lt;b&gt;");
  });

  it("isTruthy handles null", () => {
    expect(isTruthy(null)).toBe(false);
    expect(isTruthy("x")).toBe(true);
  });
});
