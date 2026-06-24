import type {
  ArrowTipStyle,
  Diagram,
  DiagramObject,
  Edge,
  EdgeEndpointSymbol,
  EdgeStyle,
  GridSettings,
  GridLineObject,
  LoopSide,
  Point,
  ShadeRegionObject,
} from "../model/types";
import { adaptiveGridForDiagram } from "../layout/adaptiveGrid";
import { gridToSvg } from "../layout/coordinates";
import { effectiveBoxGridSize } from "../model/boxMetrics";
import { tikzColorValue, tikzFillOption } from "../model/shadeColors";

type NodeMap = Map<string, string>;

function sanitizeTikzId(id: string): string {
  const safe = id.replace(/[^A-Za-z0-9_-]/g, "-").replace(/^[^A-Za-z]+/, "");
  return safe || "node";
}

function uniqueTikzNames(objects: DiagramObject[]): NodeMap {
  const seen = new Set<string>();
  const map: NodeMap = new Map();

  for (const object of objects) {
    const base = sanitizeTikzId(object.id);
    let candidate = base;
    let suffix = 1;
    while (seen.has(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    seen.add(candidate);
    map.set(object.id, candidate);
  }

  return map;
}

function formatCoord(point: Point): string {
  return `(${round(point.x)},${round(-point.y)})`;
}

function gridPointToTikz(point: Point, grid: GridSettings): Point {
  const svg = gridToSvg(point, grid);
  return {
    x: (svg.x - grid.origin.x) / grid.spacing,
    y: (svg.y - grid.origin.y) / grid.spacing,
  };
}

function gridCoord(point: Point, grid: GridSettings): string {
  return formatCoord(gridPointToTikz(point, grid));
}

function round(value: number): string {
  return Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(3))}`;
}

function arrowOption(arrowhead: GridLineObject["arrowhead"]): string {
  switch (arrowhead) {
    case "end":
      return "->";
    case "start":
      return "<-";
    case "both":
      return "<->";
    case "none":
      return "";
  }
}

function lineStyle(object: GridLineObject): string {
  const lineOptions: Record<GridLineObject["style"], string> = {
    solid: "line width=.45pt",
    dashed: "dashed,dash pattern=on 4pt off 6pt,line width=.45pt",
    dotted: "dotted,line width=.45pt",
    guide: "guide",
    double: "double,double distance=2pt,line width=.45pt",
    "double-dashed": "double,dashed,dash pattern=on 4pt off 6pt,double distance=2pt,line width=.45pt",
  };
  const options = [lineOptions[object.style], arrowOption(object.arrowhead)]
    .filter(Boolean)
    .join(",");
  return options;
}

function arrowTip(tip?: ArrowTipStyle): string {
  switch (tip ?? "stealth") {
    case "stealth":
      return "Stealth";
    case "latex":
      return "Latex";
    case "triangle":
      return "Triangle";
    case "to":
      return "To";
  }
}

function endpointSymbol(symbol: EdgeEndpointSymbol, tip?: ArrowTipStyle): string {
  switch (symbol) {
    case "arrow":
      return arrowTip(tip);
    case "bar":
      return "Bar";
    case "dot":
      return "Circle";
    case "none":
      return "";
  }
}

function edgeArrowStyle(edge: Edge): string {
  const start = endpointSymbol(edge.startSymbol ?? "none", edge.startArrowTip);
  const end = endpointSymbol(
    edge.endSymbol ?? (edge.arrowhead ? "arrow" : "none"),
    edge.endArrowTip,
  );
  if (!start && !end) {
    return "";
  }
  return `${start}-${end}`;
}

function edgeStyle(edge: Edge, includeBend = true): string {
  const lineStyleMap: Record<EdgeStyle, string> = {
    solid: "line width=.55pt,shorten >=4pt,shorten <=3pt",
    dashed: "dashed,dash pattern=on 4pt off 6pt,line width=.55pt,shorten >=4pt,shorten <=3pt",
    guide: "guide",
    wavy: "decorate,decoration={snake, amplitude=2pt, segment length=7pt},line width=.55pt",
    double: "double,double distance=2pt,line width=.55pt,shorten >=4pt,shorten <=3pt",
    "double-dashed": "double,dashed,dash pattern=on 4pt off 6pt,double distance=2pt,line width=.55pt,shorten >=4pt,shorten <=3pt",
  };
  const arrow = edgeArrowStyle(edge);
  const extras = [
    arrow,
    edge.color ? `draw=${tikzColorValue(edge.color)}` : "",
    edge.shortenStart !== undefined ? `shorten <=${edge.shortenStart}pt` : "",
    edge.shortenEnd !== undefined ? `shorten >=${edge.shortenEnd}pt` : "",
    includeBend && edge.bend !== undefined && edge.bend !== 0 ? `bend left=${edge.bend}` : "",
  ].filter(Boolean);
  return [lineStyleMap[edge.style], ...extras].join(",");
}

function loopAngles(side: LoopSide = "top"): { out: number; in: number } {
  switch (side) {
    case "top":
      return { out: 135, in: 45 };
    case "right":
      return { out: 45, in: -45 };
    case "bottom":
      return { out: -45, in: -135 };
    case "left":
      return { out: -135, in: 135 };
  }
}

function loopAnglesFromDegrees(angle: number): { out: number; in: number } {
  const normalized = ((angle % 360) + 360) % 360;
  return {
    out: normalized + 45,
    in: normalized - 45,
  };
}

function loopLooseness(size = 34): string {
  return round(Math.max(4, Math.min(16, size / 6)));
}

function mathContents(tex: string, fontSize: "small" | "normal" | "large"): string {
  if (fontSize === "small") {
    return `{\\small $${tex}$}`;
  }
  if (fontSize === "large") {
    return `{\\large $${tex}$}`;
  }
  return `{$${tex}$}`;
}

function nodeLatex(object: DiagramObject, names: NodeMap, grid: GridSettings): string | null {
  const name = names.get(object.id);
  if (!name) {
    return null;
  }

  switch (object.type) {
    case "math-label": {
      const point = gridPointToTikz({ x: object.x, y: object.y }, grid);
      const x = point.x + (object.xOffset ?? 0) / grid.spacing;
      const y = point.y + (object.yOffset ?? 0) / grid.spacing;
      const options = object.color ? `[text=${tikzColorValue(object.color)}] ` : "";
      return `  \\node ${options}(${name}) at ${formatCoord({ x, y })} ${mathContents(object.tex, object.fontSize)};`;
    }
    case "dot-node":
      return `  \\node[circle,fill,inner sep=0pt,minimum size=${round(object.radius)}pt] (${name}) at ${gridCoord({ x: object.x, y: object.y }, grid)} {};`;
    case "box-label": {
      const size = effectiveBoxGridSize(object, grid.spacing);
      const options = [
        object.showBorder === false ? "draw=none" : `draw=${tikzColorValue(object.borderColor ?? "black")}`,
        object.borderWidth !== undefined ? `line width=${round(object.borderWidth)}pt` : "",
        object.fill ? tikzFillOption(object.fill) : "",
        object.fill && object.fillOpacity !== undefined ? `fill opacity=${round(object.fillOpacity)}` : "",
        object.color ? `text=${tikzColorValue(object.color)}` : "",
        object.rounded ? "rounded corners=3pt" : "",
        `minimum width=${round(size.width)}cm`,
        `minimum height=${round(size.height)}cm`,
      ].filter(Boolean);
      return `  \\node[${options.join(",")}] (${name}) at ${gridCoord({ x: object.x, y: object.y }, grid)} ${mathContents(object.tex, object.fontSize)};`;
    }
    case "ellipsis":
      return `  \\node (${name}) at ${gridCoord({ x: object.x, y: object.y }, grid)} ${mathContents(object.orientation === "horizontal" ? "\\cdots" : "\\vdots", object.fontSize ?? "large")};`;
    case "grid-line":
    case "shade-region":
      return null;
  }
}

function gridLineLatex(object: GridLineObject, grid: GridSettings): string {
  const from =
    object.orientation === "horizontal"
      ? gridCoord({ x: object.start, y: object.position }, grid)
      : gridCoord({ x: object.position, y: object.start }, grid);
  const to =
    object.orientation === "horizontal"
      ? gridCoord({ x: object.end, y: object.position }, grid)
      : gridCoord({ x: object.position, y: object.end }, grid);
  return `  \\draw[${lineStyle(object)}] ${from} -- ${to};`;
}

function shadeLatex(object: ShadeRegionObject, grid: GridSettings): string {
  const topLeft = gridPointToTikz({ x: object.x, y: object.y }, grid);
  const bottomRight = {
    x: topLeft.x + object.width,
    y: topLeft.y + object.height,
  };
  const options = [
    "shadebox",
    object.fill !== "gray!20" ? tikzFillOption(object.fill) : "",
    object.opacity !== undefined && object.opacity < 1 ? `fill opacity=${round(object.opacity)}` : "",
    object.roundedCorners ? `rounded corners=${object.roundedCorners}` : "",
  ].filter(Boolean);
  return `  \\filldraw[${options.join(",")}] ${formatCoord(topLeft)} rectangle ${formatCoord(bottomRight)};`;
}

function edgeLatex(edge: Edge, names: NodeMap): string | null {
  const from = names.get(edge.from);
  const to = names.get(edge.to);
  if (!from || !to) {
    return null;
  }

  if (edge.from === edge.to) {
    const angles =
      edge.loopAngle !== undefined ? loopAnglesFromDegrees(edge.loopAngle) : loopAngles(edge.loopSide);
    return `  \\draw[${edgeStyle(edge, false)}] (${from}) to[out=${angles.out},in=${angles.in},looseness=${loopLooseness(edge.loopSize)}] (${to});`;
  }

  const path =
    edge.bend !== undefined && edge.bend !== 0
      ? `(${from}) to (${to})`
      : `(${from}) -- (${to})`;
  return `  \\draw[${edgeStyle(edge)}] ${path};`;
}

export function exportTikz(diagram: Diagram): string {
  const grid = adaptiveGridForDiagram(diagram);
  const names = uniqueTikzNames(diagram.objects);
  const shades = diagram.objects.filter(
    (object): object is ShadeRegionObject => object.type === "shade-region",
  );
  const lines = diagram.objects.filter(
    (object): object is GridLineObject => object.type === "grid-line",
  );
  const nodes = diagram.objects
    .map((object) => nodeLatex(object, names, grid))
    .filter((line): line is string => Boolean(line));
  const edges = diagram.edges
    .map((edge) => edgeLatex(edge, names))
    .filter((line): line is string => Boolean(line));

  return String.raw`% Requires:
% \usepackage{tikz}
% \usetikzlibrary{arrows.meta,decorations.pathmorphing,backgrounds}
\begin{tikzpicture}[
  x=1cm,
  y=1cm,
  >=stealth,
  every node/.style={
    inner sep=1pt,
    outer sep=0pt
  },
  arr/.style={
    ->,
    line width=.55pt,
    shorten >=4pt,
    shorten <=3pt
  },
  darr/.style={
    arr,
    dashed,
    dash pattern=on 4pt off 6pt
  },
  guide/.style={
    dashed,
    dash pattern=on 3pt off 7pt,
    line width=.45pt
  },
  wavy/.style={
    decorate,
    decoration={snake, amplitude=2pt, segment length=7pt},
    ->,
    line width=.55pt
  },
  shadebox/.style={
    rounded corners=6pt,
    fill=gray!20,
    draw=none
  }
]
\begin{pgfonlayer}{background}
${shades.map((shade) => shadeLatex(shade, grid)).join("\n")}
\end{pgfonlayer}
${lines.map((line) => gridLineLatex(line, grid)).join("\n")}
${nodes.join("\n")}
${edges.join("\n")}
\end{tikzpicture}
`;
}
