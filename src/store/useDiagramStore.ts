import { create } from "zustand";
import { emptyDiagram } from "../model/defaults";
import { DEFAULT_SHADE_OPACITY } from "../model/shadeColors";
import type {
  Diagram,
  DiagramObject,
  Edge,
  GridLineObject,
  Selection,
  ShadeRegionObject,
  Tool,
} from "../model/types";
import { seedDiagram } from "../demo/seedDiagram";

type DiagramState = {
  diagram: Diagram;
  past: Diagram[];
  future: Diagram[];
  tool: Tool;
  selection: Selection;
  pendingArrowFrom: string | null;
  editingObjectId: string | null;
  tikzPanelOpen: boolean;
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;
  setTool: (tool: Tool) => void;
  setTikzPanelOpen: (open: boolean) => void;
  selectObject: (id: string) => void;
  selectObjects: (ids: string[]) => void;
  toggleObjectSelection: (id: string) => void;
  selectEdge: (id: string) => void;
  clearSelection: () => void;
  startEditingObject: (id: string) => void;
  stopEditingObject: () => void;
  addObject: (object: DiagramObject) => void;
  addObjectAndEdge: (object: DiagramObject, edge: Edge) => void;
  addEdge: (edge: Edge) => void;
  updateObjectLive: (id: string, patch: Partial<DiagramObject>) => void;
  updateObject: (id: string, patch: Partial<DiagramObject>) => void;
  updateEdge: (id: string, patch: Partial<Edge>) => void;
  moveObject: (id: string, x: number, y: number) => void;
  moveObjects: (positions: Array<{ id: string; x: number; y: number }>) => void;
  deleteSelected: () => void;
  handleArrowObjectClick: (id: string) => void;
  loadDemo: () => void;
  replaceDiagram: (diagram: Diagram) => void;
};

let nextId = 1;

export function newId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

function cloneDiagram(diagram: Diagram): Diagram {
  return JSON.parse(JSON.stringify(diagram)) as Diagram;
}

function canMove(object: DiagramObject): object is Exclude<DiagramObject, GridLineObject> {
  return object.type !== "grid-line";
}

function withHistory(state: DiagramState, diagram: Diagram): Partial<DiagramState> {
  return {
    diagram,
    past: [...state.past, cloneDiagram(state.diagram)].slice(-80),
    future: [],
  };
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  diagram: cloneDiagram(emptyDiagram),
  past: [],
  future: [],
  tool: "select",
  selection: null,
  pendingArrowFrom: null,
  editingObjectId: null,
  tikzPanelOpen: true,

  checkpoint: () =>
    set((state) => ({
      past: [...state.past, cloneDiagram(state.diagram)].slice(-80),
      future: [],
    })),

  undo: () =>
    set((state) => {
      const previous = state.past.at(-1);
      if (!previous) {
        return state;
      }

      return {
        diagram: cloneDiagram(previous),
        past: state.past.slice(0, -1),
        future: [cloneDiagram(state.diagram), ...state.future],
        selection: null,
        pendingArrowFrom: null,
        editingObjectId: null,
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) {
        return state;
      }

      return {
        diagram: cloneDiagram(next),
        past: [...state.past, cloneDiagram(state.diagram)].slice(-80),
        future: state.future.slice(1),
        selection: null,
        pendingArrowFrom: null,
        editingObjectId: null,
      };
    }),

  setTool: (tool) =>
    set({
      tool,
      pendingArrowFrom: tool === "arrow" ? get().pendingArrowFrom : null,
      editingObjectId: null,
    }),

  setTikzPanelOpen: (open) => set({ tikzPanelOpen: open }),

  selectObject: (id) => set({ selection: { kind: "object", id } }),

  selectObjects: (ids) =>
    set({
      selection:
        ids.length === 0
          ? null
          : ids.length === 1
            ? { kind: "object", id: ids[0] }
            : { kind: "objects", ids },
      editingObjectId: null,
      pendingArrowFrom: null,
    }),

  toggleObjectSelection: (id) =>
    set((state) => {
      const selection = state.selection;
      if (selection?.kind === "objects") {
        const ids = selection.ids.includes(id)
          ? selection.ids.filter((selectedId) => selectedId !== id)
          : [...selection.ids, id];
        return {
          selection:
            ids.length === 0
              ? null
              : ids.length === 1
                ? { kind: "object", id: ids[0] }
                : { kind: "objects", ids },
          editingObjectId: null,
          pendingArrowFrom: null,
        };
      }

      if (selection?.kind === "object") {
        if (selection.id === id) {
          return { selection: null, editingObjectId: null, pendingArrowFrom: null };
        }
        return {
          selection: { kind: "objects", ids: [selection.id, id] },
          editingObjectId: null,
          pendingArrowFrom: null,
        };
      }

      return {
        selection: { kind: "object", id },
        editingObjectId: null,
        pendingArrowFrom: null,
      };
    }),

  selectEdge: (id) => set({ selection: { kind: "edge", id } }),

  clearSelection: () =>
    set({ selection: null, pendingArrowFrom: null, editingObjectId: null }),

  startEditingObject: (id) =>
    set({ selection: { kind: "object", id }, editingObjectId: id }),

  stopEditingObject: () => set({ editingObjectId: null }),

  addObject: (object) =>
    set((state) => ({
      ...withHistory(state, {
        ...state.diagram,
        objects: [...state.diagram.objects, object],
      }),
      selection: { kind: "object", id: object.id },
    })),

  addObjectAndEdge: (object, edge) =>
    set((state) => ({
      ...withHistory(state, {
        ...state.diagram,
        objects: [...state.diagram.objects, object],
        edges: [...state.diagram.edges, edge],
      }),
      selection: { kind: "edge", id: edge.id },
      pendingArrowFrom: null,
    })),

  addEdge: (edge) =>
    set((state) => ({
      ...withHistory(state, {
        ...state.diagram,
        edges: [...state.diagram.edges, edge],
      }),
      selection: { kind: "edge", id: edge.id },
      pendingArrowFrom: null,
    })),

  updateObjectLive: (id, patch) =>
    set((state) => ({
      diagram: {
        ...state.diagram,
        objects: state.diagram.objects.map((object) =>
          object.id === id ? ({ ...object, ...patch } as DiagramObject) : object,
        ),
      },
    })),

  updateObject: (id, patch) =>
    set((state) => ({
      ...withHistory(state, {
        ...state.diagram,
        objects: state.diagram.objects.map((object) =>
          object.id === id ? ({ ...object, ...patch } as DiagramObject) : object,
        ),
      }),
    })),

  updateEdge: (id, patch) =>
    set((state) => ({
      ...withHistory(state, {
        ...state.diagram,
        edges: state.diagram.edges.map((edge) =>
          edge.id === id ? { ...edge, ...patch } : edge,
        ),
      }),
    })),

  moveObject: (id, x, y) =>
    set((state) => ({
      diagram: {
        ...state.diagram,
        objects: state.diagram.objects.map((object) => {
          if (object.id !== id || !canMove(object)) {
            return object;
          }

          if (object.type === "shade-region") {
            return { ...object, x, y } satisfies ShadeRegionObject;
          }

          return { ...object, x, y } as DiagramObject;
        }),
      },
    })),

  moveObjects: (positions) =>
    set((state) => ({
      diagram: {
        ...state.diagram,
        objects: state.diagram.objects.map((object) => {
          const position = positions.find((item) => item.id === object.id);
          if (!position || !canMove(object)) {
            return object;
          }

          if (object.type === "shade-region") {
            return { ...object, x: position.x, y: position.y } satisfies ShadeRegionObject;
          }

          return { ...object, x: position.x, y: position.y } as DiagramObject;
        }),
      },
    })),

  deleteSelected: () =>
    set((state) => {
      const selection = state.selection;
      if (!selection) {
        return state;
      }

      if (selection.kind === "edge") {
        return {
          ...withHistory(state, {
            ...state.diagram,
            edges: state.diagram.edges.filter((edge) => edge.id !== selection.id),
          }),
          selection: null,
        };
      }

      if (selection.kind === "objects") {
        const ids = new Set(selection.ids);
        return {
          ...withHistory(state, {
            ...state.diagram,
            objects: state.diagram.objects.filter((object) => !ids.has(object.id)),
            edges: state.diagram.edges.filter(
              (edge) => !ids.has(edge.from) && !ids.has(edge.to),
            ),
          }),
          selection: null,
          pendingArrowFrom:
            state.pendingArrowFrom && ids.has(state.pendingArrowFrom)
              ? null
              : state.pendingArrowFrom,
        };
      }

      return {
        ...withHistory(state, {
          ...state.diagram,
          objects: state.diagram.objects.filter((object) => object.id !== selection.id),
          edges: state.diagram.edges.filter(
            (edge) => edge.from !== selection.id && edge.to !== selection.id,
          ),
        }),
        selection: null,
        pendingArrowFrom:
          state.pendingArrowFrom === selection.id ? null : state.pendingArrowFrom,
      };
    }),

  handleArrowObjectClick: (id) => {
    const pending = get().pendingArrowFrom;
    if (!pending) {
      set({ pendingArrowFrom: id, selection: { kind: "object", id } });
      return;
    }

    if (pending === id) {
      set({ pendingArrowFrom: null });
      return;
    }

    get().addEdge({
      id: newId("edge"),
      from: pending,
      to: id,
      style: "solid",
      arrowhead: true,
      shortenStart: 3,
      shortenEnd: 4,
    });
  },

  loadDemo: () =>
    set((state) => ({
      ...withHistory(state, cloneDiagram(seedDiagram)),
      selection: null,
      pendingArrowFrom: null,
      editingObjectId: null,
      tool: "select",
      tikzPanelOpen: true,
    })),

  replaceDiagram: (diagram) =>
    set((state) => ({
      ...withHistory(state, diagram),
      selection: null,
      pendingArrowFrom: null,
      editingObjectId: null,
      tool: "select",
    })),
}));

export function makeMathLabel(x: number, y: number): DiagramObject {
  return {
    id: newId("label"),
    type: "math-label",
    tex: "x",
    x,
    y,
    fontSize: "normal",
  };
}

export function makeDotNode(x: number, y: number): DiagramObject {
  return {
    id: newId("dot"),
    type: "math-label",
    tex: "\\bullet",
    x,
    y,
    fontSize: "normal",
  };
}

export function makeBoxLabel(x: number, y: number): DiagramObject {
  return {
    id: newId("box"),
    type: "box-label",
    tex: "\\tau",
    x,
    y,
    width: 1.2,
    height: 0.75,
    rounded: true,
  };
}

export function makeGridLine(
  orientation: "horizontal" | "vertical",
  position: number,
  start = 0,
  end = 12,
): DiagramObject {
  return {
    id: newId(orientation === "horizontal" ? "hline" : "vline"),
    type: "grid-line",
    orientation,
    position,
    start,
    end,
    style: "solid",
    arrowhead: "none",
  };
}

export function makeShadeRegion(
  x: number,
  y: number,
  width: number,
  height: number,
): DiagramObject {
  return {
    id: newId("shade"),
    type: "shade-region",
    x,
    y,
    width,
    height,
    fill: "gray!20",
    opacity: DEFAULT_SHADE_OPACITY,
    roundedCorners: "6pt",
    layer: "background",
  };
}
