import type { DiagramObject, GridSettings, Point } from "../model/types";

export function gridToSvg(point: Point, grid: GridSettings): Point {
  return {
    x: axisToSvg(point.x, grid.origin.x, grid.spacing, grid.columnWidths),
    y: axisToSvg(point.y, grid.origin.y, grid.spacing, grid.rowHeights),
  };
}

export function svgToGrid(point: Point, grid: GridSettings): Point {
  const raw = svgToRawGrid(point, grid);
  return grid.snap ? snapPoint(raw) : raw;
}

export function svgToRawGrid(point: Point, grid: GridSettings): Point {
  return {
    x: axisFromSvg(point.x, grid.origin.x, grid.spacing, grid.columnWidths),
    y: axisFromSvg(point.y, grid.origin.y, grid.spacing, grid.rowHeights),
  };
}

function axisToSvg(
  value: number,
  origin: number,
  spacing: number,
  widths?: number[],
): number {
  if (!widths || value <= 0) {
    return origin + value * spacing;
  }

  const index = Math.floor(value);
  const fraction = value - index;
  let offset = 0;

  for (let i = 0; i < index; i += 1) {
    offset += widths[i] ?? spacing;
  }

  return origin + offset + fraction * (widths[index] ?? spacing);
}

function axisFromSvg(
  value: number,
  origin: number,
  spacing: number,
  widths?: number[],
): number {
  const delta = value - origin;
  if (!widths || delta <= 0) {
    return delta / spacing;
  }

  let remaining = delta;
  let index = 0;
  while (remaining >= (widths[index] ?? spacing)) {
    remaining -= widths[index] ?? spacing;
    index += 1;
  }

  return index + remaining / (widths[index] ?? spacing);
}

export function snapPoint(point: Point): Point {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

export function nearestCellCenter(point: Point): Point {
  return {
    x: Math.floor(point.x) + 0.5,
    y: Math.floor(point.y) + 0.5,
  };
}

export function nearestGridPoint(point: Point): Point {
  return snapPoint(point);
}

export function gridDistance(a: Point, b: Point, grid: GridSettings): number {
  const svgA = gridToSvg(a, grid);
  const svgB = gridToSvg(b, grid);
  return Math.hypot(svgA.x - svgB.x, svgA.y - svgB.y);
}

export function isNearCellCenter(point: Point, grid: GridSettings): boolean {
  const localX = point.x - Math.floor(point.x);
  const localY = point.y - Math.floor(point.y);
  const margin = 0.08;

  return (
    localX >= margin &&
    localX <= 1 - margin &&
    localY >= margin &&
    localY <= 1 - margin
  );
}

export function isNearGridPoint(point: Point, grid: GridSettings): boolean {
  return gridDistance(point, nearestGridPoint(point), grid) <= grid.spacing * 0.2;
}

export function objectCenter(object: DiagramObject, grid: GridSettings): Point {
  if (object.type === "grid-line") {
    const point =
      object.orientation === "horizontal"
        ? { x: (object.start + object.end) / 2, y: object.position }
        : { x: object.position, y: (object.start + object.end) / 2 };
    return gridToSvg(point, grid);
  }

  if (object.type === "shade-region") {
    return gridToSvg(
      { x: object.x + object.width / 2, y: object.y + object.height / 2 },
      grid,
    );
  }

  const base = gridToSvg({ x: object.x, y: object.y }, grid);
  if (object.type === "math-label") {
    return {
      x: base.x + (object.xOffset ?? 0),
      y: base.y + (object.yOffset ?? 0),
    };
  }
  return base;
}

export function clientPointToSvg(
  event: Pick<MouseEvent | React.PointerEvent, "clientX" | "clientY">,
  svg: SVGSVGElement,
): Point {
  const rect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const scaleX = viewBox.width / rect.width;
  const scaleY = viewBox.height / rect.height;
  return {
    x: viewBox.x + (event.clientX - rect.left) * scaleX,
    y: viewBox.y + (event.clientY - rect.top) * scaleY,
  };
}
