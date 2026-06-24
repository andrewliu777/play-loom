import { useEffect, useMemo, useRef, useState } from "react";
import { adaptiveGridForDiagram } from "../layout/adaptiveGrid";
import {
  clientPointToSvg,
  gridDistance,
  gridToSvg,
  isNearCellCenter,
  nearestCellCenter,
  nearestGridPoint,
  objectCenter,
  svgToGrid,
  svgToRawGrid,
} from "../layout/coordinates";
import type { Diagram, DiagramObject, GridSettings, Point } from "../model/types";
import {
  makeBoxLabel,
  makeDotNode,
  makeGridLine,
  makeMathLabel,
  makeShadeRegion,
  newId,
  useDiagramStore,
} from "../store/useDiagramStore";
import { EdgeView, makeSelfLoopPath, objectClearance, trimLine } from "./EdgeView";
import { GridView } from "./GridView";
import { ObjectView } from "./ObjectView";

type ObjectGesture = {
  kind: "object";
  id: string;
  pointerId: number;
  startRaw: Point;
  currentRaw: Point;
  moveMode: boolean;
  additiveSelection: boolean;
  startPositions: Array<{ id: string; x: number; y: number }>;
  wasSelected: boolean;
  moved: boolean;
};

type CanvasGesture = {
  kind: "canvas";
  pointerId: number;
  startRaw: Point;
  currentRaw: Point;
  moved: boolean;
};

type ShadeDrag = {
  pointerId: number;
  start: Point;
  current: Point;
};

type LineDrag = {
  pointerId: number;
  startRaw: Point;
  currentRaw: Point;
  moved: boolean;
};

type PendingVertex = {
  x: number;
  y: number;
};

type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 3.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampViewBox(box: ViewBox, grid: GridSettings): ViewBox {
  const maxX = Math.max(0, grid.canvas.width - box.width);
  const maxY = Math.max(0, grid.canvas.height - box.height);

  return {
    ...box,
    x: box.width >= grid.canvas.width ? 0 : clamp(box.x, 0, maxX),
    y: box.height >= grid.canvas.height ? 0 : clamp(box.y, 0, maxY),
  };
}

function wheelDeltaScale(event: WheelEvent, rect: DOMRect): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return 16;
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return rect.height;
  }
  return 1;
}

function isMovable(object: DiagramObject): boolean {
  return object.type !== "grid-line";
}

function canConnect(object: DiagramObject): boolean {
  return (
    object.type === "math-label" ||
    object.type === "dot-node" ||
    object.type === "box-label" ||
    object.type === "ellipsis"
  );
}

function objectGridPoint(object: DiagramObject): Point | null {
  if (
    object.type === "math-label" ||
    object.type === "dot-node" ||
    object.type === "box-label" ||
    object.type === "ellipsis"
  ) {
    return { x: object.x, y: object.y };
  }
  return null;
}

function objectMovePoint(object: DiagramObject): Point | null {
  if (
    object.type === "math-label" ||
    object.type === "dot-node" ||
    object.type === "box-label" ||
    object.type === "ellipsis" ||
    object.type === "shade-region"
  ) {
    return { x: object.x, y: object.y };
  }
  return null;
}

function objectSelectionPoint(object: DiagramObject): Point | null {
  if (object.type === "shade-region") {
    return { x: object.x + object.width / 2, y: object.y + object.height / 2 };
  }
  return objectMovePoint(object);
}

function normalizeRect(start: Point, end: Point): { x: number; y: number; width: number; height: number } {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    width: Math.max(1, Math.abs(end.x - start.x)),
    height: Math.max(1, Math.abs(end.y - start.y)),
  };
}

function normalizeFreeRect(start: Point, end: Point): { x: number; y: number; width: number; height: number } {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function pointInRect(point: Point, rect: { x: number; y: number; width: number; height: number }): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return Math.max(aStart, bStart) <= Math.min(aEnd, bEnd);
}

function objectIntersectsSelectionRect(
  object: DiagramObject,
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  if (object.type === "grid-line") {
    const rectEndX = rect.x + rect.width;
    const rectEndY = rect.y + rect.height;

    if (object.orientation === "horizontal") {
      return (
        object.position >= rect.y &&
        object.position <= rectEndY &&
        rangesOverlap(object.start, object.end, rect.x, rectEndX)
      );
    }

    return (
      object.position >= rect.x &&
      object.position <= rectEndX &&
      rangesOverlap(object.start, object.end, rect.y, rectEndY)
    );
  }

  const point = objectSelectionPoint(object);
  return point ? pointInRect(point, rect) : false;
}

function gridLineDraft(
  startRaw: Point,
  endRaw: Point,
): {
  orientation: "horizontal" | "vertical";
  position: number;
  start: number;
  end: number;
} | null {
  const start = nearestGridPoint(startRaw);
  const end = nearestGridPoint(endRaw);
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return null;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      orientation: "horizontal",
      position: start.y,
      start: Math.min(start.x, end.x),
      end: Math.max(start.x, end.x),
    };
  }

  return {
    orientation: "vertical",
    position: start.x,
    start: Math.min(start.y, end.y),
    end: Math.max(start.y, end.y),
  };
}

export function DiagramCanvas() {
  const {
    diagram,
    tool,
    selection,
    editingObjectId,
    pendingArrowFrom,
    addObject,
    addObjectAndEdge,
    addEdge,
    selectObject,
    selectObjects,
    selectEdge,
    toggleObjectSelection,
    clearSelection,
    moveObjects,
    checkpoint,
    updateObjectLive,
    startEditingObject,
    stopEditingObject,
    handleArrowObjectClick,
  } = useDiagramStore();
  const renderGrid = useMemo(() => adaptiveGridForDiagram(diagram), [diagram]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [objectGesture, setObjectGesture] = useState<ObjectGesture | null>(null);
  const [canvasGesture, setCanvasGesture] = useState<CanvasGesture | null>(null);
  const [shadeDrag, setShadeDrag] = useState<ShadeDrag | null>(null);
  const [lineDrag, setLineDrag] = useState<LineDrag | null>(null);
  const [pendingVertex, setPendingVertex] = useState<PendingVertex | null>(null);
  const [viewBox, setViewBox] = useState<ViewBox>({
    x: 0,
    y: 0,
    width: renderGrid.canvas.width,
    height: renderGrid.canvas.height,
  });

  function svgPoint(event: React.PointerEvent<SVGSVGElement>): Point {
    return clientPointToSvg(event, event.currentTarget);
  }

  function objectAt(rawPoint: Point, exceptId?: string): DiagramObject | null {
    let nearest: DiagramObject | null = null;
    let nearestDistance = Infinity;

    for (const object of diagram.objects) {
      if (object.id === exceptId || !canConnect(object)) {
        continue;
      }

      const point = objectGridPoint(object);
      if (!point) {
        continue;
      }

      const distance = gridDistance(rawPoint, point, renderGrid);
      if (distance < nearestDistance && distance <= renderGrid.spacing * 0.48) {
        nearest = object;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  function objectInCell(rawPoint: Point, exceptId?: string): DiagramObject | null {
    let nearest: DiagramObject | null = null;
    let nearestDistance = Infinity;
    const cellX = Math.floor(rawPoint.x);
    const cellY = Math.floor(rawPoint.y);

    for (const object of diagram.objects) {
      if (object.id === exceptId || !canConnect(object)) {
        continue;
      }

      const point = objectGridPoint(object);
      if (!point || Math.floor(point.x) !== cellX || Math.floor(point.y) !== cellY) {
        continue;
      }

      const distance = gridDistance(rawPoint, point, renderGrid);
      if (distance < nearestDistance) {
        nearest = object;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  function isObjectSelected(id: string): boolean {
    return (
      (selection?.kind === "object" && selection.id === id) ||
      (selection?.kind === "objects" && selection.ids.includes(id))
    );
  }

  function selectedObjectIds(): string[] {
    if (selection?.kind === "object") {
      return [selection.id];
    }
    if (selection?.kind === "objects") {
      return selection.ids;
    }
    return [];
  }

  function objectIdsInRect(rect: { x: number; y: number; width: number; height: number }): string[] {
    return diagram.objects
      .filter((object) => objectIntersectsSelectionRect(object, rect))
      .map((object) => object.id);
  }

  function handleCanvasPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }

    stopEditingObject();

    const rawPoint = svgToRawGrid(svgPoint(event), renderGrid);
    const snappedPoint = svgToGrid(svgPoint(event), renderGrid);

    if (tool === "math-label") {
      addObject(makeMathLabel(snappedPoint.x, snappedPoint.y));
      return;
    }

    if (tool === "dot-node") {
      const center = nearestCellCenter(rawPoint);
      addObject(makeDotNode(center.x, center.y));
      return;
    }

    if (tool === "box-label") {
      addObject(makeBoxLabel(snappedPoint.x, snappedPoint.y));
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    if (tool === "grid-line") {
      setPendingVertex(null);
      setLineDrag({
        pointerId: event.pointerId,
        startRaw: rawPoint,
        currentRaw: rawPoint,
        moved: false,
      });
      return;
    }

    if (tool === "shade-region") {
      setShadeDrag({ pointerId: event.pointerId, start: snappedPoint, current: snappedPoint });
      return;
    }

    setCanvasGesture({
      kind: "canvas",
      pointerId: event.pointerId,
      startRaw: rawPoint,
      currentRaw: rawPoint,
      moved: false,
    });
  }

  function handleCanvasPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const rawPoint = svgToRawGrid(svgPoint(event), renderGrid);

    if (objectGesture) {
      setObjectGesture({
        ...objectGesture,
        currentRaw: rawPoint,
        moved:
          objectGesture.moved ||
          gridDistance(rawPoint, objectGesture.startRaw, renderGrid) > 5,
      });
      return;
    }

    if (canvasGesture) {
      setCanvasGesture({
        ...canvasGesture,
        currentRaw: rawPoint,
        moved:
          canvasGesture.moved ||
          gridDistance(rawPoint, canvasGesture.startRaw, renderGrid) > 5,
      });
      return;
    }

    if (lineDrag) {
      setLineDrag({
        ...lineDrag,
        currentRaw: rawPoint,
        moved:
          lineDrag.moved ||
          gridDistance(rawPoint, lineDrag.startRaw, renderGrid) > 5,
      });
      return;
    }

    if (shadeDrag) {
      setShadeDrag({ ...shadeDrag, current: svgToGrid(svgPoint(event), renderGrid) });
    }
  }

  function handleCanvasPointerUp(event: React.PointerEvent<SVGSVGElement>) {
    const rawPoint = svgToRawGrid(svgPoint(event), renderGrid);

    if (objectGesture) {
      event.currentTarget.releasePointerCapture(objectGesture.pointerId);
      const source = diagram.objects.find((object) => object.id === objectGesture.id);
      const target = objectAt(rawPoint);

      if (objectGesture.moved && source && objectGesture.moveMode && isMovable(source)) {
        const sourceStart = objectGesture.startPositions.find(
          (position) => position.id === source.id,
        );
        const center = nearestCellCenter(rawPoint);
        const delta = sourceStart
          ? { x: center.x - sourceStart.x, y: center.y - sourceStart.y }
          : { x: 0, y: 0 };
        const nextPositions = objectGesture.startPositions.map((position) => ({
          id: position.id,
          x: position.x + delta.x,
          y: position.y + delta.y,
        }));
        checkpoint();
        moveObjects(nextPositions);
        if (objectGesture.startPositions.length === 1) {
          selectObject(source.id);
        }
      } else if (objectGesture.moved && source && canConnect(source) && target) {
        addEdge({
          id: newId("edge"),
          from: source.id,
          to: target.id,
          style: "solid",
          arrowhead: true,
          shortenStart: 3,
          shortenEnd: 4,
        });
      } else if (
        objectGesture.moved &&
        source &&
        canConnect(source)
      ) {
        const center = nearestCellCenter(rawPoint);
        const dot = makeDotNode(center.x, center.y);
        addObjectAndEdge(dot, {
          id: newId("edge"),
          from: source.id,
          to: dot.id,
          style: "solid",
          arrowhead: true,
          shortenStart: 3,
          shortenEnd: 4,
        });
      } else if (
        source?.type === "math-label" &&
        !objectGesture.additiveSelection &&
        objectGesture.wasSelected &&
        isObjectSelected(source.id)
      ) {
        checkpoint();
        startEditingObject(source.id);
      } else if (source) {
        if (objectGesture.additiveSelection) {
          toggleObjectSelection(source.id);
        } else {
          selectObject(source.id);
        }
      }

      setObjectGesture(null);
      return;
    }

    if (canvasGesture) {
      event.currentTarget.releasePointerCapture(canvasGesture.pointerId);

      if (tool === "select" && canvasGesture.moved) {
        const rect = normalizeFreeRect(canvasGesture.startRaw, canvasGesture.currentRaw);
        const ids = objectIdsInRect(rect);
        selectObjects(event.shiftKey ? Array.from(new Set([...selectedObjectIds(), ...ids])) : ids);
        setPendingVertex(null);
      } else if (!canvasGesture.moved) {
        const existing = objectInCell(rawPoint) ?? objectAt(rawPoint);
        if (existing?.type === "math-label") {
          setPendingVertex(null);
          checkpoint();
          startEditingObject(existing.id);
        } else if (existing) {
          setPendingVertex(null);
          selectObject(existing.id);
        } else if (isNearCellCenter(rawPoint, renderGrid)) {
          const center = nearestCellCenter(rawPoint);
          if (
            pendingVertex &&
            pendingVertex.x === center.x &&
            pendingVertex.y === center.y
          ) {
            const dot = makeDotNode(center.x, center.y);
            addObject(dot);
            startEditingObject(dot.id);
            setPendingVertex(null);
          } else {
            clearSelection();
            setPendingVertex(center);
          }
        } else {
          clearSelection();
          setPendingVertex(null);
        }
      }

      setCanvasGesture(null);
      return;
    }

    if (lineDrag) {
      event.currentTarget.releasePointerCapture(lineDrag.pointerId);
      const line = lineDrag.moved ? gridLineDraft(lineDrag.startRaw, lineDrag.currentRaw) : null;
      if (line) {
        addObject(makeGridLine(line.orientation, line.position, line.start, line.end));
      }
      setLineDrag(null);
      return;
    }

    if (shadeDrag) {
      event.currentTarget.releasePointerCapture(shadeDrag.pointerId);
      const rect = normalizeRect(shadeDrag.start, shadeDrag.current);
      addObject(makeShadeRegion(rect.x, rect.y, rect.width, rect.height));
      setShadeDrag(null);
    }
  }

  function handleObjectPointerDown(
    event: React.PointerEvent<SVGGElement>,
    object: DiagramObject,
  ) {
    event.stopPropagation();

    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) {
      return;
    }

    if (tool === "grid-line") {
      stopEditingObject();
      setPendingVertex(null);
      svg.setPointerCapture(event.pointerId);
      const rawPoint = svgToRawGrid(clientPointToSvg(event, svg), renderGrid);
      setLineDrag({
        pointerId: event.pointerId,
        startRaw: rawPoint,
        currentRaw: rawPoint,
        moved: false,
      });
      return;
    }

    if (tool === "arrow") {
      handleArrowObjectClick(object.id);
      return;
    }

    stopEditingObject();
    setPendingVertex(null);

    svg.setPointerCapture(event.pointerId);
    const rawPoint = svgToRawGrid(clientPointToSvg(event, svg), renderGrid);
    const selectedIds =
      selection?.kind === "objects" && selection.ids.includes(object.id)
        ? selection.ids
        : [object.id];
    const startPositions = diagram.objects
      .filter((candidate) => selectedIds.includes(candidate.id) && isMovable(candidate))
      .flatMap((candidate) => {
        const point = objectMovePoint(candidate);
        return point ? [{ id: candidate.id, x: point.x, y: point.y }] : [];
      });
    setObjectGesture({
      kind: "object",
      id: object.id,
      pointerId: event.pointerId,
      startRaw: rawPoint,
      currentRaw: rawPoint,
      moveMode: event.metaKey || selectedIds.length > 1,
      additiveSelection: event.shiftKey,
      startPositions,
      wasSelected: isObjectSelected(object.id),
      moved: false,
    });
  }

  function handleObjectClick(event: React.MouseEvent<SVGGElement>) {
    event.stopPropagation();
  }

  function handleTexChange(id: string, tex: string) {
    updateObjectLive(id, { tex } as Partial<DiagramObject>);
  }

  const previewRect = shadeDrag ? normalizeRect(shadeDrag.start, shadeDrag.current) : null;
  const previewTopLeft = previewRect
    ? gridToSvg({ x: previewRect.x, y: previewRect.y }, renderGrid)
    : null;
  const previewLine =
    lineDrag?.moved ? gridLineDraft(lineDrag.startRaw, lineDrag.currentRaw) : null;
  const marqueeRect =
    tool === "select" && canvasGesture?.moved
      ? normalizeFreeRect(canvasGesture.startRaw, canvasGesture.currentRaw)
      : null;
  const marqueeTopLeft = marqueeRect
    ? gridToSvg({ x: marqueeRect.x, y: marqueeRect.y }, renderGrid)
    : null;
  const marqueeBottomRight = marqueeRect
    ? gridToSvg(
        { x: marqueeRect.x + marqueeRect.width, y: marqueeRect.y + marqueeRect.height },
        renderGrid,
      )
    : null;
  const arrowDraft = (() => {
    if (!objectGesture?.moved || objectGesture.moveMode) {
      return null;
    }

    const source = diagram.objects.find((object) => object.id === objectGesture.id);
    if (!source || !canConnect(source)) {
      return null;
    }

    const from = objectCenter(source, renderGrid);
    const target = objectAt(objectGesture.currentRaw);
    const fromClearance = objectClearance(source, renderGrid) + 3;

    if (target?.id === source.id) {
      return {
        path: makeSelfLoopPath(
          from,
          fromClearance,
          fromClearance + 1,
          source.id === target.id ? "top" : undefined,
        ),
        targetId: target.id,
      };
    }

    const to = target
      ? objectCenter(target, renderGrid)
      : gridToSvg(objectGesture.currentRaw, renderGrid);
    const toClearance = target ? objectClearance(target, renderGrid) + 4 : 0;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);

    if (distance < fromClearance + toClearance + 8) {
      return null;
    }

    const trimmed = trimLine(from, to, fromClearance, toClearance);
    return {
      path: `M ${trimmed.from.x} ${trimmed.from.y} L ${trimmed.to.x} ${trimmed.to.y}`,
      targetId: target?.id ?? null,
    };
  })();
  const pendingVertexCell = pendingVertex
    ? {
        start: gridToSvg(
          { x: Math.floor(pendingVertex.x), y: Math.floor(pendingVertex.y) },
          renderGrid,
        ),
        end: gridToSvg(
          {
            x: Math.floor(pendingVertex.x) + 1,
            y: Math.floor(pendingVertex.y) + 1,
          },
          renderGrid,
        ),
      }
    : null;
  const editingObject =
    editingObjectId ? diagram.objects.find((object) => object.id === editingObjectId) : null;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const svgElement = svg;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = svgElement.getBoundingClientRect();

      setViewBox((current) => {
        if (!event.ctrlKey) {
          const deltaScale = wheelDeltaScale(event, rect);
          return clampViewBox(
            {
              ...current,
              x: current.x + (event.deltaX * deltaScale * current.width) / rect.width,
              y: current.y + (event.deltaY * deltaScale * current.height) / rect.height,
            },
            renderGrid,
          );
        }

        const focal = {
          x: current.x + ((event.clientX - rect.left) / rect.width) * current.width,
          y: current.y + ((event.clientY - rect.top) / rect.height) * current.height,
        };
        const currentZoom = renderGrid.canvas.width / current.width;
        const nextZoom = clamp(
          currentZoom * Math.exp(-event.deltaY * 0.005),
          MIN_ZOOM,
          MAX_ZOOM,
        );
        const scale = currentZoom / nextZoom;
        const nextWidth = current.width * scale;
        const nextHeight = current.height * scale;

        return clampViewBox(
          {
            x: focal.x - (focal.x - current.x) * scale,
            y: focal.y - (focal.y - current.y) * scale,
            width: nextWidth,
            height: nextHeight,
          },
          renderGrid,
        );
      });
    }

    svgElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => svgElement.removeEventListener("wheel", handleWheel);
  }, [renderGrid]);

  return (
    <section className="canvas-panel" aria-label="Diagram canvas">
      <svg
        ref={svgRef}
        className="diagram-canvas"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
      >
        <defs>
          <marker
            id="small-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" className="marker-fill" />
          </marker>
          <marker
            id="small-arrow-start"
            markerWidth="8"
            markerHeight="8"
            refX="1"
            refY="4"
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 8 0 L 0 4 L 8 8 z" className="marker-fill" />
          </marker>
          <marker
            id="latex-arrow"
            markerWidth="9"
            markerHeight="8"
            refX="8"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 9 4 L 0 8 L 2.2 4 z" className="marker-fill" />
          </marker>
          <marker
            id="latex-arrow-start"
            markerWidth="9"
            markerHeight="8"
            refX="1"
            refY="4"
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 9 0 L 0 4 L 9 8 L 6.8 4 z" className="marker-fill" />
          </marker>
          <marker
            id="triangle-arrow"
            markerWidth="9"
            markerHeight="9"
            refX="8"
            refY="4.5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0.5 0.5 L 8 4.5 L 0.5 8.5 z" className="marker-fill" />
          </marker>
          <marker
            id="triangle-arrow-start"
            markerWidth="9"
            markerHeight="9"
            refX="1"
            refY="4.5"
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 8.5 0.5 L 1 4.5 L 8.5 8.5 z" className="marker-fill" />
          </marker>
          <marker
            id="to-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0.5 0.5 L 7 4 L 0.5 7.5" className="marker-stroke" />
          </marker>
          <marker
            id="to-arrow-start"
            markerWidth="8"
            markerHeight="8"
            refX="1"
            refY="4"
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 7.5 0.5 L 1 4 L 7.5 7.5" className="marker-stroke" />
          </marker>
          <marker
            id="bar-marker"
            markerWidth="8"
            markerHeight="10"
            refX="4"
            refY="5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 4 0 L 4 10" className="marker-stroke" />
          </marker>
          <marker
            id="dot-marker"
            markerWidth="8"
            markerHeight="8"
            refX="4"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <circle cx="4" cy="4" r="2.6" className="marker-fill" />
          </marker>
        </defs>

        <GridView grid={renderGrid} />

        <g className="shade-layer">
          {diagram.objects
            .filter((object) => object.type === "shade-region")
            .map((object) => (
              <ObjectView
                key={object.id}
                object={object}
                grid={renderGrid}
                selected={isObjectSelected(object.id)}
                pendingArrow={pendingArrowFrom === object.id}
                onPointerDown={handleObjectPointerDown}
                onClick={handleObjectClick}
              />
            ))}
          {previewRect && previewTopLeft ? (
            <rect
              className="shade-preview"
              x={previewTopLeft.x}
              y={previewTopLeft.y}
              width={
                gridToSvg({ x: previewRect.x + previewRect.width, y: 0 }, renderGrid).x -
                gridToSvg({ x: previewRect.x, y: 0 }, renderGrid).x
              }
              height={previewRect.height * renderGrid.spacing}
              rx={8}
            />
          ) : null}
        </g>

        {marqueeRect && marqueeTopLeft && marqueeBottomRight ? (
          <rect
            className="selection-marquee"
            x={marqueeTopLeft.x}
            y={marqueeTopLeft.y}
            width={marqueeBottomRight.x - marqueeTopLeft.x}
            height={marqueeBottomRight.y - marqueeTopLeft.y}
          />
        ) : null}

        <g className="line-layer">
          {diagram.objects
            .filter((object) => object.type === "grid-line")
            .map((object) => (
              <ObjectView
                key={object.id}
                object={object}
                grid={renderGrid}
                selected={isObjectSelected(object.id)}
                pendingArrow={pendingArrowFrom === object.id}
                onPointerDown={handleObjectPointerDown}
                onClick={handleObjectClick}
              />
            ))}
          {previewLine ? (
            <ObjectView
              object={{
                id: "preview-line",
                type: "grid-line",
                orientation: previewLine.orientation,
                position: previewLine.position,
                start: previewLine.start,
                end: previewLine.end,
                style: "solid",
                arrowhead: "none",
              }}
              grid={renderGrid}
              selected={false}
              pendingArrow={false}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
        </g>

        <g className="edge-layer">
          {diagram.edges.map((edge) => (
            <EdgeView
              key={edge.id}
              edge={edge}
              objects={diagram.objects}
              grid={renderGrid}
              selected={selection?.kind === "edge" && selection.id === edge.id}
              onClick={(event, clickedEdge) => {
                event.stopPropagation();
                stopEditingObject();
                selectEdge(clickedEdge.id);
              }}
            />
          ))}
          {arrowDraft ? (
            <g
              className={`draft-edge ${arrowDraft.targetId ? "is-over-target" : ""}`}
              aria-label="Arrow draft"
            >
              <path
                className="draft-edge-path"
                d={arrowDraft.path}
                markerEnd="url(#small-arrow)"
              />
            </g>
          ) : null}
        </g>

        <g className="object-layer">
          {pendingVertexCell ? (
            <g className="pending-vertex" aria-label="Add vertex preview">
              <rect
                className="selection-box pending-vertex-cell"
                x={pendingVertexCell.start.x}
                y={pendingVertexCell.start.y}
                width={pendingVertexCell.end.x - pendingVertexCell.start.x}
                height={pendingVertexCell.end.y - pendingVertexCell.start.y}
              />
            </g>
          ) : null}
          {diagram.objects
            .filter((object) => object.type !== "shade-region" && object.type !== "grid-line")
            .map((object) => (
              <ObjectView
                key={object.id}
                object={object}
                grid={renderGrid}
                selected={isObjectSelected(object.id)}
                pendingArrow={pendingArrowFrom === object.id}
                onPointerDown={handleObjectPointerDown}
                onClick={handleObjectClick}
              />
            ))}
        </g>
      </svg>
      {editingObject?.type === "math-label" ? (
        <div
          className="tex-dock"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <span>TeX</span>
          <input
            value={editingObject.tex}
            autoFocus
            onFocus={(event) => {
              if (editingObject.tex === "\\bullet") {
                event.currentTarget.select();
              }
            }}
            onChange={(event) => handleTexChange(editingObject.id, event.target.value)}
            onBlur={stopEditingObject}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                stopEditingObject();
              }
              if (event.key === "Escape") {
                stopEditingObject();
              }
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
