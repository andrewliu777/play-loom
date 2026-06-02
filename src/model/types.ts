export type FontSize = "small" | "normal" | "large";
export type LineStyle = "solid" | "dashed" | "dotted" | "guide" | "double" | "double-dashed";
export type EdgeStyle = "solid" | "dashed" | "guide" | "wavy" | "double" | "double-dashed";
export type Arrowhead = "none" | "end" | "start" | "both";
export type EdgeEndpointSymbol = "none" | "arrow" | "bar" | "dot";
export type ArrowTipStyle = "stealth" | "latex" | "triangle" | "to";
export type LoopSide = "top" | "right" | "bottom" | "left";

export interface GridSettings {
  spacing: number;
  origin: { x: number; y: number };
  snap: boolean;
  editingGridVisible: boolean;
  canvas: { width: number; height: number };
  columnWidths?: number[];
  rowHeights?: number[];
}

export interface BaseObject {
  id: string;
  type:
    | "math-label"
    | "dot-node"
    | "box-label"
    | "grid-line"
    | "shade-region"
    | "ellipsis";
}

export interface MathLabelObject extends BaseObject {
  type: "math-label";
  tex: string;
  x: number;
  y: number;
  xOffset?: number;
  yOffset?: number;
  fontSize: FontSize;
  color?: string;
  anchor?: string;
}

export interface DotNodeObject extends BaseObject {
  type: "dot-node";
  x: number;
  y: number;
  radius: number;
}

export interface BoxLabelObject extends BaseObject {
  type: "box-label";
  tex: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rounded?: boolean;
  color?: string;
}

export interface GridLineObject extends BaseObject {
  type: "grid-line";
  orientation: "horizontal" | "vertical";
  position: number;
  start: number;
  end: number;
  style: LineStyle;
  arrowhead: Arrowhead;
}

export interface ShadeRegionObject extends BaseObject {
  type: "shade-region";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  opacity?: number;
  roundedCorners?: string;
  layer: "background";
}

export interface EllipsisObject extends BaseObject {
  type: "ellipsis";
  x: number;
  y: number;
  orientation: "horizontal" | "vertical";
}

export type DiagramObject =
  | MathLabelObject
  | DotNodeObject
  | BoxLabelObject
  | GridLineObject
  | ShadeRegionObject
  | EllipsisObject;

export interface Edge {
  id: string;
  from: string;
  to: string;
  style: EdgeStyle;
  arrowhead: boolean;
  startSymbol?: EdgeEndpointSymbol;
  endSymbol?: EdgeEndpointSymbol;
  startArrowTip?: ArrowTipStyle;
  endArrowTip?: ArrowTipStyle;
  fromAnchor?: string;
  toAnchor?: string;
  shortenStart?: number;
  shortenEnd?: number;
  bend?: number;
  offset?: number;
  labelPosition?: number;
  loopSide?: LoopSide;
  loopSize?: number;
  loopAngle?: number;
  color?: string;
}

export interface Diagram {
  id: string;
  title: string;
  grid: GridSettings;
  objects: DiagramObject[];
  edges: Edge[];
  stylePreset: "mosch";
}

export type Tool =
  | "select"
  | "math-label"
  | "dot-node"
  | "box-label"
  | "arrow"
  | "grid-line"
  | "shade-region";

export type Selection =
  | { kind: "object"; id: string }
  | { kind: "objects"; ids: string[] }
  | { kind: "edge"; id: string }
  | null;

export type Point = { x: number; y: number };
