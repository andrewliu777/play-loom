import type { Diagram, GridSettings } from "./types";

export const defaultGrid: GridSettings = {
  spacing: 56,
  origin: { x: 64, y: 56 },
  snap: true,
  editingGridVisible: true,
  canvas: { width: 980, height: 640 },
};

export const emptyDiagram: Diagram = {
  id: "playloom-empty",
  title: "Untitled Playloom Diagram",
  grid: defaultGrid,
  objects: [],
  edges: [],
  stylePreset: "mosch",
};
