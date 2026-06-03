import { objectCenter } from "../layout/coordinates";
import { effectiveBoxSvgSize } from "../model/boxMetrics";
import { tikzFillToCss } from "../model/shadeColors";
import type {
  ArrowTipStyle,
  DiagramObject,
  Edge,
  EdgeEndpointSymbol,
  GridSettings,
  LoopSide,
  Point,
} from "../model/types";

type EdgeViewProps = {
  edge: Edge;
  objects: DiagramObject[];
  grid: GridSettings;
  selected: boolean;
  onClick: (event: React.MouseEvent<SVGGElement>, edge: Edge) => void;
};

export function objectClearance(object: DiagramObject, grid: GridSettings): number {
  switch (object.type) {
    case "math-label": {
      if (object.tex.trim() === "\\bullet") {
        return 8;
      }
      const scale =
        object.fontSize === "small" ? 0.86 : object.fontSize === "large" ? 1.18 : 1;
      return Math.max(12, Math.min(54, object.tex.length * 3.2 * scale + 10));
    }
    case "dot-node":
      return object.radius + 5;
    case "box-label":
      return Math.max(...Object.values(effectiveBoxSvgSize(object, grid.spacing))) / 2 + 5;
    case "ellipsis":
      return 16;
    case "shade-region":
      return (Math.max(object.width, object.height) * grid.spacing) / 2 + 5;
    case "grid-line":
      return 5;
  }
}

export function trimLine(
  from: Point,
  to: Point,
  fromClearance: number,
  toClearance: number,
): { from: Point; to: Point } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);

  if (length < fromClearance + toClearance + 4) {
    return { from, to };
  }

  const ux = dx / length;
  const uy = dy / length;
  return {
    from: { x: from.x + ux * fromClearance, y: from.y + uy * fromClearance },
    to: { x: to.x - ux * toClearance, y: to.y - uy * toClearance },
  };
}

function loopAngleForSide(side: LoopSide): number {
  switch (side) {
    case "top":
      return 90;
    case "right":
      return 0;
    case "bottom":
      return 270;
    case "left":
      return 180;
  }
}

function loopNormal(angle: number): Point {
  const radians = (angle * Math.PI) / 180;
  return {
    x: Math.cos(radians),
    y: -Math.sin(radians),
  };
}

export function makeSelfLoopPath(
  center: Point,
  startClearance: number,
  endClearance: number,
  side: LoopSide = "top",
  loopSize = 34,
  loopAngle?: number,
): string {
  const normal = loopNormal(loopAngle ?? loopAngleForSide(side));
  const tangent = { x: -normal.y, y: normal.x };
  const clearance = Math.max(startClearance, endClearance);
  const neck = Math.max(8, clearance * 0.9);
  const radius = Math.max(24, loopSize + clearance * 0.45);
  const width = Math.max(18, Math.min(42, neck + radius * 0.28));

  const start = {
    x: center.x + normal.x * startClearance - tangent.x * width,
    y: center.y + normal.y * startClearance - tangent.y * width,
  };
  const end = {
    x: center.x + normal.x * endClearance + tangent.x * width,
    y: center.y + normal.y * endClearance + tangent.y * width,
  };
  const apex = {
    x: center.x + normal.x * (clearance + radius),
    y: center.y + normal.y * (clearance + radius),
  };

  const c1 = {
    x: start.x + normal.x * radius * 0.62 - tangent.x * width * 0.5,
    y: start.y + normal.y * radius * 0.62 - tangent.y * width * 0.5,
  };
  const c2 = {
    x: apex.x - tangent.x * width * 0.92,
    y: apex.y - tangent.y * width * 0.92,
  };
  const c3 = {
    x: apex.x + tangent.x * width * 0.92,
    y: apex.y + tangent.y * width * 0.92,
  };
  const c4 = {
    x: end.x + normal.x * radius * 0.62 + tangent.x * width * 0.5,
    y: end.y + normal.y * radius * 0.62 + tangent.y * width * 0.5,
  };

  return `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${apex.x} ${apex.y} C ${c3.x} ${c3.y} ${c4.x} ${c4.y} ${end.x} ${end.y}`;
}

function makeWavyPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 1) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  const steps = Math.max(12, Math.ceil(length / 4));
  const nx = -dy / length;
  const ny = dx / length;
  const wavelength = 15;
  const amplitude = 3.4;
  const points = [];

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const envelope = Math.sin(t * Math.PI);
    const wave = Math.sin((t * length * Math.PI * 2) / wavelength) * amplitude * envelope;
    points.push(`${x1 + dx * t + nx * wave} ${y1 + dy * t + ny * wave}`);
  }

  return `M ${points.join(" L ")}`;
}

function offsetLine(from: Point, to: Point, offset = 0): { from: Point; to: Point } {
  if (offset === 0) {
    return { from, to };
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) {
    return { from, to };
  }

  const nx = -dy / length;
  const ny = dx / length;
  return {
    from: { x: from.x + nx * offset, y: from.y + ny * offset },
    to: { x: to.x + nx * offset, y: to.y + ny * offset },
  };
}

function makePath(edge: Edge, from: Point, to: Point): string {
  if (edge.style === "wavy") {
    return makeWavyPath(from.x, from.y, to.x, to.y);
  }

  if (edge.bend && edge.bend !== 0) {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const bend = edge.bend * 0.75;
    const cx = midX + (-dy / length) * bend;
    const cy = midY + (dx / length) * bend;
    return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
  }

  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

function resolvedStartSymbol(edge: Edge): EdgeEndpointSymbol {
  return edge.startSymbol ?? "none";
}

function resolvedEndSymbol(edge: Edge): EdgeEndpointSymbol {
  if (edge.endSymbol) {
    return edge.endSymbol;
  }
  return edge.arrowhead ? "arrow" : "none";
}

function arrowMarkerId(tip: ArrowTipStyle | undefined, position: "start" | "end"): string {
  const suffix = position === "start" ? "-start" : "";
  switch (tip ?? "stealth") {
    case "stealth":
      return `small-arrow${suffix}`;
    case "latex":
      return `latex-arrow${suffix}`;
    case "triangle":
      return `triangle-arrow${suffix}`;
    case "to":
      return `to-arrow${suffix}`;
  }
}

function markerFor(
  symbol: EdgeEndpointSymbol,
  position: "start" | "end",
  tip?: ArrowTipStyle,
): string | undefined {
  if (symbol === "none") {
    return undefined;
  }
  if (symbol === "arrow") {
    return `url(#${arrowMarkerId(tip, position)})`;
  }
  if (symbol === "bar") {
    return "url(#bar-marker)";
  }
  return "url(#dot-marker)";
}

export function EdgeView({ edge, objects, grid, selected, onClick }: EdgeViewProps) {
  const fromObject = objects.find((object) => object.id === edge.from);
  const toObject = objects.find((object) => object.id === edge.to);

  if (!fromObject || !toObject) {
    return null;
  }

  const from = objectCenter(fromObject, grid);
  const to = objectCenter(toObject, grid);
  const fromClearance = objectClearance(fromObject, grid) + (edge.shortenStart ?? 3);
  const toClearance = objectClearance(toObject, grid) + (edge.shortenEnd ?? 4);
  const trimmed = trimLine(from, to, fromClearance, toClearance);
  const shifted = offsetLine(trimmed.from, trimmed.to, edge.offset ?? 0);
  const path =
    fromObject.id === toObject.id
      ? makeSelfLoopPath(
          from,
          fromClearance,
          toClearance,
          edge.loopSide,
          edge.loopSize,
          edge.loopAngle,
        )
      : makePath(edge, shifted.from, shifted.to);
  const startSymbol = resolvedStartSymbol(edge);
  const endSymbol = resolvedEndSymbol(edge);
  const strokeColor = edge.color ? tikzFillToCss(edge.color) : undefined;
  const isDouble = edge.style === "double" || edge.style === "double-dashed";
  const edgeStyle = strokeColor ? { stroke: strokeColor } : undefined;

  return (
    <g
      className={`diagram-edge ${selected ? "is-selected" : ""}`}
      onClick={(event) => onClick(event, edge)}
    >
      {selected ? <path className="edge-selection" d={path} /> : null}
      {isDouble ? (
        <>
          <path
            className={`edge-path edge-${edge.style} edge-double-outer`}
            d={path}
            style={edgeStyle}
          />
          <path className={`edge-path edge-${edge.style} edge-double-inner`} d={path} />
          <path
            className="edge-marker-carrier"
            d={path}
            markerStart={markerFor(startSymbol, "start", edge.startArrowTip)}
            markerEnd={markerFor(endSymbol, "end", edge.endArrowTip)}
            style={edgeStyle}
          />
        </>
      ) : (
        <path
          className={`edge-path edge-${edge.style}`}
          d={path}
          markerStart={markerFor(startSymbol, "start", edge.startArrowTip)}
          markerEnd={markerFor(endSymbol, "end", edge.endArrowTip)}
          style={edgeStyle}
        />
      )}
      <path className="edge-hit" d={path} />
    </g>
  );
}
