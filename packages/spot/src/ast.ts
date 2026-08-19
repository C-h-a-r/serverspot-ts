export type TextNode = { type: "text"; value: string };
export type EchoNode = { type: "echo"; expression: string; raw: boolean };
export type IfNode = {
  type: "if";
  condition: string;
  body: SpotNode[];
  elseifs: { condition: string; body: SpotNode[] }[];
  elseBody: SpotNode[] | null;
};
export type ForeachNode = {
  type: "foreach";
  collection: string;
  item: string;
  body: SpotNode[];
};
export type IncludeNode = { type: "include"; path: string };

export type SpotNode = TextNode | EchoNode | IfNode | ForeachNode | IncludeNode;

export type SpotDocument = { nodes: SpotNode[] };
