import { estimateTexSvgSize } from "../model/boxMetrics";
import type { Diagram, GridSettings } from "../model/types";

function estimateTexWidth(tex: string, fontSize: "small" | "normal" | "large"): number {
  return estimateTexSvgSize(tex, fontSize).width;
}

export function adaptiveGridForDiagram(diagram: Diagram): GridSettings {
  const base = diagram.grid;
  const columnCount = Math.ceil((base.canvas.width - base.origin.x) / base.spacing) + 2;
  const columnWidths = Array.from({ length: columnCount }, () => base.spacing);

  for (const object of diagram.objects) {
    let requiredWidth = 0;
    let x = 0;

    if (object.type === "math-label") {
      x = object.x;
      requiredWidth = estimateTexWidth(object.tex, object.fontSize) + 18;
    } else if (object.type === "ellipsis") {
      x = object.x;
      requiredWidth = 48;
    }

    if (requiredWidth <= base.spacing * 1.42) {
      continue;
    }

    const column = Math.max(0, Math.floor(x));
    columnWidths[column] = Math.max(columnWidths[column] ?? base.spacing, requiredWidth);
  }

  const expandedWidth =
    base.origin.x + columnWidths.reduce((sum, width) => sum + width, 0) + base.origin.x;

  return {
    ...base,
    columnWidths,
    canvas: {
      ...base.canvas,
      width: Math.max(base.canvas.width, expandedWidth),
    },
  };
}
