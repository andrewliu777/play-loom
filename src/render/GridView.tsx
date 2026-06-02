import type { GridSettings } from "../model/types";
import { gridToSvg } from "../layout/coordinates";

type GridViewProps = {
  grid: GridSettings;
};

export function GridView({ grid }: GridViewProps) {
  if (!grid.editingGridVisible) {
    return null;
  }

  const verticalLines = [];
  const horizontalLines = [];

  const columnCount = Math.max(
    Math.ceil((grid.canvas.width - grid.origin.x) / grid.spacing) + 2,
    (grid.columnWidths?.length ?? 0) + 1,
  );
  const rowCount = Math.max(
    Math.ceil((grid.canvas.height - grid.origin.y) / grid.spacing) + 2,
    (grid.rowHeights?.length ?? 0) + 1,
  );

  for (let column = 0; column <= columnCount; column += 1) {
    const x = gridToSvg({ x: column, y: 0 }, grid).x;
    verticalLines.push(
      <line key={`v-${x}`} x1={x} y1={0} x2={x} y2={grid.canvas.height} />,
    );
  }

  for (let row = 0; row <= rowCount; row += 1) {
    const y = gridToSvg({ x: 0, y: row }, grid).y;
    horizontalLines.push(
      <line key={`h-${y}`} x1={0} y1={y} x2={grid.canvas.width} y2={y} />,
    );
  }

  return (
    <g className="editing-grid" aria-hidden="true">
      {verticalLines}
      {horizontalLines}
    </g>
  );
}
