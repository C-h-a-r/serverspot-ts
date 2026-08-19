import type { SpotDocument, SpotNode } from "./ast";

const DIRECTIVE_RE =
  /@(if|elseif|else|endif|foreach|endforeach|include)\b(?:\s*\(([^)]*)\))?/g;
const ECHO_RAW_RE = /\{!!\s*([\s\S]*?)\s*!!\}/g;
const ECHO_ESCAPED_RE = /\{\{\s*([\s\S]*?)\s*\}\}/g;

type DirectiveMatch = {
  index: number;
  length: number;
  name: string;
  args: string;
};

function findDirectives(input: string): DirectiveMatch[] {
  const matches: DirectiveMatch[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(DIRECTIVE_RE.source, "g");
  while ((m = re.exec(input)) !== null) {
    matches.push({
      index: m.index,
      length: m[0].length,
      name: m[1] ?? "",
      args: (m[2] ?? "").trim(),
    });
  }
  return matches;
}

function parseNodes(input: string): SpotNode[] {
  const nodes: SpotNode[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const slice = input.slice(cursor);

    const echoRaw = slice.match(/^\{!!\s*([\s\S]*?)\s*!!\}/);
    if (echoRaw) {
      nodes.push({ type: "echo", expression: echoRaw[1]!.trim(), raw: true });
      cursor += echoRaw[0].length;
      continue;
    }

    const echoEsc = slice.match(/^\{\{\s*([\s\S]*?)\s*\}\}/);
    if (echoEsc) {
      nodes.push({ type: "echo", expression: echoEsc[1]!.trim(), raw: false });
      cursor += echoEsc[0].length;
      continue;
    }

    const dirMatch = slice.match(
      /^@(if|elseif|else|endif|foreach|endforeach|include)\b(?:\s*\(([^)]*)\))?/,
    );
    if (dirMatch) {
      const name = dirMatch[1]!;
      const args = (dirMatch[2] ?? "").trim();

      if (name === "if") {
        const parsed = parseIfBlock(input, cursor);
        nodes.push(parsed.node);
        cursor = parsed.end;
        continue;
      }

      if (name === "foreach") {
        const parsed = parseForeachBlock(input, cursor);
        nodes.push(parsed.node);
        cursor = parsed.end;
        continue;
      }

      if (name === "include") {
        const pathMatch = args.match(/^['"]([^'"]+)['"]$/);
        if (!pathMatch) {
          throw new Error(`Invalid @include path: ${args}`);
        }
        nodes.push({ type: "include", path: pathMatch[1]! });
        cursor += dirMatch[0].length;
        continue;
      }

      throw new Error(`Unexpected directive @${name} at position ${cursor}`);
    }

    const nextSpecial = slice.search(/\{!!|\{\{|@(?:if|elseif|else|endif|foreach|endforeach|include)\b/);
    const textEnd = nextSpecial === -1 ? slice.length : nextSpecial;
    if (textEnd > 0) {
      nodes.push({ type: "text", value: slice.slice(0, textEnd) });
      cursor += textEnd;
    } else {
      cursor += 1;
    }
  }

  return nodes;
}

function parseIfBlock(input: string, start: number): { node: SpotNode; end: number } {
  const openMatch = input.slice(start).match(/^@if\s*\(([^)]*)\)/);
  if (!openMatch) throw new Error("Invalid @if directive");
  const condition = openMatch[1]!.trim();
  let cursor = start + openMatch[0].length;

  const elseifs: { condition: string; body: SpotNode[] }[] = [];
  let elseBody: SpotNode[] | null = null;

  const initial = readUntil(input, cursor, ["@elseif", "@else", "@endif"]);
  let body = initial.nodes;
  cursor = initial.end;

  while (cursor < input.length) {
    const slice = input.slice(cursor);
    if (slice.startsWith("@elseif")) {
      const m = slice.match(/^@elseif\s*\(([^)]*)\)/);
      if (!m) throw new Error("Invalid @elseif directive");
      const elseifCond = m[1]!.trim();
      cursor += m[0].length;
      const branch = readUntil(input, cursor, ["@elseif", "@else", "@endif"]);
      elseifs.push({ condition: elseifCond, body: branch.nodes });
      cursor = branch.end;
      continue;
    }
    if (slice.startsWith("@else")) {
      cursor += "@else".length;
      const branch = readUntil(input, cursor, ["@endif"]);
      elseBody = branch.nodes;
      cursor = branch.end;
      continue;
    }
    if (slice.startsWith("@endif")) {
      cursor += "@endif".length;
      return {
        node: { type: "if", condition, body, elseifs, elseBody },
        end: cursor,
      };
    }
    break;
  }

  throw new Error("Unclosed @if block");
}

function parseForeachBlock(input: string, start: number): { node: SpotNode; end: number } {
  const openMatch = input.slice(start).match(/^@foreach\s*\(([^)]+)\)/);
  if (!openMatch) throw new Error("Invalid @foreach directive");

  const parts = openMatch[1]!.split(/\s+as\s+/);
  if (parts.length !== 2) throw new Error(`Invalid @foreach syntax: ${openMatch[1]}`);
  const collection = parts[0]!.trim();
  const item = parts[1]!.trim();
  let cursor = start + openMatch[0].length;

  const branch = readUntil(input, cursor, ["@endforeach"]);
  const endMatch = input.slice(branch.end).match(/^@endforeach/);
  if (!endMatch) throw new Error("Unclosed @foreach block");

  return {
    node: { type: "foreach", collection, item, body: branch.nodes },
    end: branch.end + endMatch[0].length,
  };
}

function readUntil(
  input: string,
  start: number,
  terminators: string[],
): { nodes: SpotNode[]; end: number } {
  let cursor = start;
  const nodes: SpotNode[] = [];

  while (cursor < input.length) {
    for (const term of terminators) {
      if (input.slice(cursor).startsWith(term)) {
        return { nodes, end: cursor };
      }
    }
    const slice = input.slice(cursor);
    const nextTerm = findNextTerminator(slice, terminators);
    const chunk = nextTerm === -1 ? slice : slice.slice(0, nextTerm);
    nodes.push(...parseNodes(chunk));
    cursor += chunk.length;
  }

  throw new Error(`Expected terminator: ${terminators.join(", ")}`);
}

function findNextTerminator(input: string, terminators: string[]): number {
  let earliest = -1;
  for (const term of terminators) {
    const idx = input.indexOf(term);
    if (idx !== -1 && (earliest === -1 || idx < earliest)) {
      earliest = idx;
    }
  }
  return earliest;
}

export function parseSpotTemplate(source: string): SpotDocument {
  return { nodes: parseNodes(source) };
}

export function stripSpotDirectives(source: string): string {
  return source
    .replace(ECHO_RAW_RE, "")
    .replace(ECHO_ESCAPED_RE, "")
    .replace(DIRECTIVE_RE, "");
}
