import katex from "katex";
import { gridToSvg } from "../layout/coordinates";
import { DEFAULT_SHADE_OPACITY, tikzFillToCss } from "../model/shadeColors";
import type { DiagramObject, GridSettings } from "../model/types";

type ObjectViewProps = {
  object: DiagramObject;
  grid: GridSettings;
  selected: boolean;
  pendingArrow: boolean;
  onPointerDown: (event: React.PointerEvent<SVGGElement>, object: DiagramObject) => void;
  onClick: (event: React.MouseEvent<SVGGElement>, object: DiagramObject) => void;
};

function mathScale(fontSize?: string): number {
  if (fontSize === "small") {
    return 0.86;
  }
  if (fontSize === "large") {
    return 1.18;
  }
  return 1;
}

function renderMath(tex: string): string {
  try {
    return katex.renderToString(tex, {
      displayMode: false,
      throwOnError: false,
      strict: false,
      output: "html",
    });
  } catch {
    return katex.renderToString("\\text{?}", {
      displayMode: false,
      throwOnError: false,
      strict: false,
      output: "html",
    });
  }
}

function mathBoxSize(tex: string, fontSize?: string): { width: number; height: number } {
  const scale = mathScale(fontSize);
  return {
    width: Math.max(46, Math.min(260, tex.length * 9 * scale + 30)),
    height: Math.max(34, 36 * scale),
  };
}

function tikzRadiusToSvg(value: string | undefined, spacing: number): number {
  if (!value) {
    return 0;
  }

  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(pt|cm|mm|px)?$/i);
  if (!match) {
    return 8;
  }

  const amount = Math.max(0, Number(match[1]));
  const unit = match[2]?.toLowerCase() ?? "pt";

  if (unit === "cm") {
    return amount * spacing;
  }
  if (unit === "mm") {
    return (amount / 10) * spacing;
  }
  if (unit === "px") {
    return amount;
  }

  return (amount / 28.45) * spacing;
}

function MathForeignObject({
  tex,
  x,
  y,
  fontSize,
  color,
}: {
  tex: string;
  x: number;
  y: number;
  fontSize?: string;
  color?: string;
}) {
  const size = mathBoxSize(tex, fontSize);
  return (
    <foreignObject
      className="math-foreign-object"
      x={x - size.width / 2}
      y={y - size.height / 2}
      width={size.width}
      height={size.height}
    >
      <div
        className="math-html"
        style={{ color, transform: `scale(${mathScale(fontSize)})` }}
        dangerouslySetInnerHTML={{ __html: renderMath(tex) }}
      />
    </foreignObject>
  );
}

function shiftedLine(
  start: { x: number; y: number },
  end: { x: number; y: number },
  distance: number,
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: (-dy / length) * distance, y: (dx / length) * distance };

  return {
    start: { x: start.x + normal.x, y: start.y + normal.y },
    end: { x: end.x + normal.x, y: end.y + normal.y },
  };
}

export function ObjectView({
  object,
  grid,
  selected,
  pendingArrow,
  onPointerDown,
  onClick,
}: ObjectViewProps) {
  const className = `diagram-object ${selected ? "is-selected" : ""} ${pendingArrow ? "is-pending-arrow" : ""}`;

  if (object.type === "shade-region") {
    const topLeft = gridToSvg({ x: object.x, y: object.y }, grid);
    const cornerRadius = tikzRadiusToSvg(object.roundedCorners, grid.spacing);
    return (
      <g
        className={className}
        onPointerDown={(event) => onPointerDown(event, object)}
        onClick={(event) => onClick(event, object)}
      >
        <rect
          className="shade-region"
          x={topLeft.x}
          y={topLeft.y}
          width={object.width * grid.spacing}
          height={object.height * grid.spacing}
          rx={cornerRadius}
          ry={cornerRadius}
          style={{
            fill: tikzFillToCss(object.fill),
            opacity: object.opacity ?? DEFAULT_SHADE_OPACITY,
          }}
        />
        {selected ? (
          <rect
            className="selection-box"
            x={topLeft.x}
            y={topLeft.y}
            width={object.width * grid.spacing}
            height={object.height * grid.spacing}
            rx={cornerRadius}
            ry={cornerRadius}
          />
        ) : null}
      </g>
    );
  }

  if (object.type === "grid-line") {
    const start =
      object.orientation === "horizontal"
        ? gridToSvg({ x: object.start, y: object.position }, grid)
        : gridToSvg({ x: object.position, y: object.start }, grid);
    const end =
      object.orientation === "horizontal"
        ? gridToSvg({ x: object.end, y: object.position }, grid)
        : gridToSvg({ x: object.position, y: object.end }, grid);
    const isDoubleLine = object.style === "double" || object.style === "double-dashed";
    const markerEnd = object.arrowhead === "end" || object.arrowhead === "both" ? "url(#small-arrow)" : undefined;
    const markerStart =
      object.arrowhead === "start" || object.arrowhead === "both" ? "url(#small-arrow-start)" : undefined;
    const doubleA = shiftedLine(start, end, -2.2);
    const doubleB = shiftedLine(start, end, 2.2);

    return (
      <g
        className={className}
        onPointerDown={(event) => onPointerDown(event, object)}
        onClick={(event) => onClick(event, object)}
      >
        {isDoubleLine ? (
          <>
            <line
              className={`structural-line line-${object.style}`}
              x1={doubleA.start.x}
              y1={doubleA.start.y}
              x2={doubleA.end.x}
              y2={doubleA.end.y}
            />
            <line
              className={`structural-line line-${object.style}`}
              x1={doubleB.start.x}
              y1={doubleB.start.y}
              x2={doubleB.end.x}
              y2={doubleB.end.y}
            />
            <line
              className="structural-line line-double-marker"
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              markerEnd={markerEnd}
              markerStart={markerStart}
            />
          </>
        ) : (
          <line
            className={`structural-line line-${object.style}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            markerEnd={markerEnd}
            markerStart={markerStart}
          />
        )}
        <line className="hit-line" x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
        {selected ? (
          <line
            className="selection-line"
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
          />
        ) : null}
      </g>
    );
  }

  const point = gridToSvg({ x: object.x, y: object.y }, grid);
  const x = object.type === "math-label" ? point.x + (object.xOffset ?? 0) : point.x;
  const y = object.type === "math-label" ? point.y + (object.yOffset ?? 0) : point.y;

  if (object.type === "dot-node") {
    return (
      <g
        className={className}
        onPointerDown={(event) => onPointerDown(event, object)}
        onClick={(event) => onClick(event, object)}
      >
        <circle className="dot-node" cx={x} cy={y} r={object.radius} />
        <circle className="hit-circle" cx={x} cy={y} r={14} />
        {selected ? <circle className="selection-circle" cx={x} cy={y} r={12} /> : null}
      </g>
    );
  }

  if (object.type === "box-label") {
    const width = object.width * grid.spacing;
    const height = object.height * grid.spacing;
    return (
      <g
        className={className}
        onPointerDown={(event) => onPointerDown(event, object)}
        onClick={(event) => onClick(event, object)}
      >
        <rect
          className="box-label"
          x={x - width / 2}
          y={y - height / 2}
          width={width}
          height={height}
          rx={object.rounded ? 5 : 0}
        />
        <MathForeignObject tex={object.tex} x={x} y={y} color={object.color ? tikzFillToCss(object.color) : undefined} />
        {selected ? (
          <rect
            className="selection-box"
            x={x - width / 2}
            y={y - height / 2}
            width={width}
            height={height}
            rx={5}
          />
        ) : null}
      </g>
    );
  }

  if (object.type === "ellipsis") {
    return (
      <g
        className={className}
        onPointerDown={(event) => onPointerDown(event, object)}
        onClick={(event) => onClick(event, object)}
      >
        <MathForeignObject
          tex={object.orientation === "horizontal" ? "\\cdots" : "\\vdots"}
          x={x}
          y={y}
          fontSize="large"
        />
        {selected ? <circle className="selection-circle" cx={x} cy={y} r={16} /> : null}
      </g>
    );
  }

  return (
    <g
      className={className}
      onPointerDown={(event) => onPointerDown(event, object)}
      onClick={(event) => onClick(event, object)}
    >
      <MathForeignObject
        tex={object.tex}
        x={x}
        y={y}
        fontSize={object.fontSize}
        color={object.color ? tikzFillToCss(object.color) : undefined}
      />
      <circle className="hit-circle" cx={x} cy={y} r={18} />
      {selected ? <circle className="selection-circle" cx={x} cy={y} r={18} /> : null}
    </g>
  );
}
