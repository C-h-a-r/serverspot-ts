import sanitizeHtml from "sanitize-html";
import type { SpotNode } from "./ast";
import {
  escapeHtml,
  evaluateExpression,
  isTruthy,
} from "./expressions";
import { parseSpotTemplate } from "./parser";
import type { SpotContext, SpotValue } from "./types";
import { SPOT_LIMITS } from "./types";

export type RenderOptions = {
  context: SpotContext;
  loadPartial: (path: string) => string;
  includeDepth?: number;
};

export function renderSpotTemplate(source: string, options: RenderOptions): string {
  const doc = parseSpotTemplate(source);
  return renderNodes(doc.nodes, {
    ...options,
    includeDepth: options.includeDepth ?? 0,
  });
}

function renderNodes(nodes: SpotNode[], options: RenderOptions): string {
  return nodes.map((node) => renderNode(node, options)).join("");
}

function renderNode(node: SpotNode, options: RenderOptions): string {
  switch (node.type) {
    case "text":
      return node.value;
    case "echo": {
      const value = evaluateExpression(node.expression, options.context);
      if (node.raw) {
        return sanitizeRawHtml(String(value ?? ""));
      }
      return escapeHtml(value);
    }
    case "if":
      return renderIf(node, options);
    case "foreach":
      return renderForeach(node, options);
    case "include":
      return renderInclude(node, options);
    default:
      return "";
  }
}

function renderIf(
  node: Extract<SpotNode, { type: "if" }>,
  options: RenderOptions,
): string {
  if (isTruthy(evaluateExpression(node.condition, options.context))) {
    return renderNodes(node.body, options);
  }
  for (const elseif of node.elseifs) {
    if (isTruthy(evaluateExpression(elseif.condition, options.context))) {
      return renderNodes(elseif.body, options);
    }
  }
  if (node.elseBody) {
    return renderNodes(node.elseBody, options);
  }
  return "";
}

function renderForeach(
  node: Extract<SpotNode, { type: "foreach" }>,
  options: RenderOptions,
): string {
  const collection = evaluateExpression(node.collection, options.context);
  if (!Array.isArray(collection)) return "";

  const items = collection.slice(0, SPOT_LIMITS.maxForeachItems);
  return items
    .map((item) => {
      const childContext: SpotContext = {
        ...options.context,
        [node.item]: item as SpotValue,
      };
      return renderNodes(node.body, { ...options, context: childContext });
    })
    .join("");
}

function renderInclude(
  node: Extract<SpotNode, { type: "include" }>,
  options: RenderOptions,
): string {
  const depth = options.includeDepth ?? 0;
  if (depth >= SPOT_LIMITS.maxIncludeDepth) {
    throw new Error(`Max @include depth (${SPOT_LIMITS.maxIncludeDepth}) exceeded`);
  }

  const partialSource = options.loadPartial(node.path);
  const partialDoc = parseSpotTemplate(partialSource);
  return renderNodes(partialDoc.nodes, {
    ...options,
    includeDepth: depth + 1,
  });
}

function sanitizeRawHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "h3", "h4", "h5", "h6"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
  });
}

export function buildCssVariables(config: Record<string, string>): string {
  const lines = Object.entries(config).map(([key, value]) => {
    const cssKey = key.replace(/_/g, "-");
    return `  --config-${cssKey}: ${value};`;
  });
  return `:root {\n${lines.join("\n")}\n}`;
}

export function buildCspHeader(themeScriptSrc: string): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    `style-src 'self' 'unsafe-inline'`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
