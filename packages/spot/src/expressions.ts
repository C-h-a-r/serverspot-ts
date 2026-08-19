import type { SpotContext, SpotValue } from "./types";

type Token =
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "boolean"; value: boolean }
  | { type: "null" }
  | { type: "ident"; value: string }
  | { type: "op"; value: string }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "comma" };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma" });
      i++;
      continue;
    }

    const strMatch = input.slice(i).match(/^"([^"\\]|\\.)*"|^'([^'\\]|\\.)*'/);
    if (strMatch) {
      const raw = strMatch[0];
      const unquoted = raw.slice(1, -1).replace(/\\(.)/g, "$1");
      tokens.push({ type: "string", value: unquoted });
      i += raw.length;
      continue;
    }

    const numMatch = input.slice(i).match(/^\d+(?:\.\d+)?/);
    if (numMatch) {
      tokens.push({ type: "number", value: Number(numMatch[0]) });
      i += numMatch[0].length;
      continue;
    }

    const opMatch = input.slice(i).match(/^(==|!=|>=|<=|>|<|and|or|not)(?=\s|$|\))/);
    if (opMatch) {
      tokens.push({ type: "op", value: opMatch[1]! });
      i += opMatch[1]!.length;
      continue;
    }

    const identMatch = input.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_.]*/);
    if (identMatch) {
      const value = identMatch[0];
      if (value === "true") tokens.push({ type: "boolean", value: true });
      else if (value === "false") tokens.push({ type: "boolean", value: false });
      else if (value === "null") tokens.push({ type: "null" });
      else tokens.push({ type: "ident", value });
      i += value.length;
      continue;
    }

    throw new Error(`Unexpected character in expression: ${ch}`);
  }

  return tokens;
}

export function evaluateExpression(expr: string, context: SpotContext): SpotValue {
  const tokens = tokenize(expr.trim());
  const [result] = parseOr(tokens, 0, context);
  return result;
}

function parseOr(
  tokens: Token[],
  pos: number,
  context: SpotContext,
): [SpotValue, number] {
  let [left, next] = parseAnd(tokens, pos, context);
  while (next < tokens.length) {
    const token = tokens[next];
    if (token?.type === "op" && token.value === "or") {
      const [right, after] = parseAnd(tokens, next + 1, context);
      left = Boolean(left) || Boolean(right);
      next = after;
    } else break;
  }
  return [left, next];
}

function parseAnd(
  tokens: Token[],
  pos: number,
  context: SpotContext,
): [SpotValue, number] {
  let [left, next] = parseComparison(tokens, pos, context);
  while (next < tokens.length) {
    const token = tokens[next];
    if (token?.type === "op" && token.value === "and") {
      const [right, after] = parseComparison(tokens, next + 1, context);
      left = Boolean(left) && Boolean(right);
      next = after;
    } else break;
  }
  return [left, next];
}

function parseComparison(
  tokens: Token[],
  pos: number,
  context: SpotContext,
): [SpotValue, number] {
  let [left, next] = parseUnary(tokens, pos, context);
  const op = tokens[next];
  if (op?.type === "op" && ["==", "!=", ">", "<", ">=", "<="].includes(op.value)) {
    const [right, after] = parseUnary(tokens, next + 1, context);
    switch (op.value) {
      case "==":
        return [left === right, after];
      case "!=":
        return [left !== right, after];
      case ">":
        return [Number(left) > Number(right), after];
      case "<":
        return [Number(left) < Number(right), after];
      case ">=":
        return [Number(left) >= Number(right), after];
      case "<=":
        return [Number(left) <= Number(right), after];
    }
  }
  return [left, next];
}

function parseUnary(
  tokens: Token[],
  pos: number,
  context: SpotContext,
): [SpotValue, number] {
  const token = tokens[pos];
  if (token?.type === "op" && token.value === "not") {
    const [val, next] = parseUnary(tokens, pos + 1, context);
    return [!val, next];
  }
  return parsePrimary(tokens, pos, context);
}

function parsePrimary(
  tokens: Token[],
  pos: number,
  context: SpotContext,
): [SpotValue, number] {
  const token = tokens[pos];
  if (!token) throw new Error("Unexpected end of expression");

  if (token.type === "string") return [token.value, pos + 1];
  if (token.type === "number") return [token.value, pos + 1];
  if (token.type === "boolean") return [token.value, pos + 1];
  if (token.type === "null") return [null, pos + 1];

  if (token.type === "ident") {
    if (tokens[pos + 1]?.type === "lparen") {
      return parseCall(token.value, tokens, pos + 2, context);
    }
    return [resolvePath(token.value, context), pos + 1];
  }

  if (token.type === "lparen") {
    const [val, next] = parseOr(tokens, pos + 1, context);
    if (tokens[next]?.type !== "rparen") throw new Error("Expected closing paren");
    return [val, next + 1];
  }

  throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
}

function parseCall(
  name: string,
  tokens: Token[],
  pos: number,
  context: SpotContext,
): [SpotValue, number] {
  const args: SpotValue[] = [];
  let cursor = pos;

  if (tokens[cursor]?.type !== "rparen") {
    for (;;) {
      const [arg, next] = parseOr(tokens, cursor, context);
      args.push(arg);
      cursor = next;
      if (tokens[cursor]?.type === "comma") {
        cursor++;
        continue;
      }
      break;
    }
  }

  if (tokens[cursor]?.type !== "rparen") throw new Error("Expected closing paren in call");
  cursor++;

  if (name === "config") {
    const key = String(args[0] ?? "");
    return [context.config?.[key as keyof SpotValue] ?? "", cursor];
  }

  if (name === "display_url") {
    const url = String(args[0] ?? "");
    return [sanitizeUrl(url), cursor];
  }

  throw new Error(`Unknown function: ${name}`);
}

function resolvePath(path: string, context: SpotContext): SpotValue {
  const parts = path.split(".");
  let current: SpotValue = context;
  for (const part of parts) {
    if (current == null || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, SpotValue>)[part];
  }
  return current;
}

export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    return "";
  }
  return "";
}

export function escapeHtml(value: SpotValue): string {
  const str = value == null ? "" : String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isTruthy(value: SpotValue): boolean {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
