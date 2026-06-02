import { useEffect, useState } from "react";
import type { Tool } from "../model/types";
import { useDiagramStore } from "../store/useDiagramStore";
import { Icon, type IconName } from "./Icon";

const tools: Array<{ id: Tool; label: string; title: string; icon: IconName }> = [
  { id: "select", label: "Select", title: "Default vertex and arrow gestures", icon: "hand" },
  { id: "box-label", label: "Box", title: "Add boxed label", icon: "box" },
  { id: "grid-line", label: "Line", title: "Drag between grid points to add a visible line", icon: "line" },
  { id: "shade-region", label: "Shade", title: "Drag exported shaded region", icon: "shade" },
];

export function Toolbar() {
  const [helpOpen, setHelpOpen] = useState(false);
  const {
    tool,
    selection,
    past,
    future,
    undo,
    redo,
    setTool,
    deleteSelected,
  } = useDiagramStore();

  useEffect(() => {
    if (!helpOpen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setHelpOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [helpOpen]);

  return (
    <header className="toolbar">
      <div className="brand-block">
        <div className="app-mark">P</div>
        <div>
          <h1>Playloom</h1>
          <span>Playscript to ordinary TikZ</span>
        </div>
      </div>

      <div className="tool-group" aria-label="Tools">
        {tools.map((item) => (
          <button
            key={item.id}
            aria-label={item.label}
            className={`icon-button ${tool === item.id ? "is-active" : ""}`}
            data-tooltip={item.label}
            type="button"
            title={item.title}
            onClick={() => setTool(item.id)}
          >
            <Icon name={item.icon} />
            <span className="visually-hidden">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="tool-group toolbar-actions" aria-label="Actions">
        <button
          aria-label="Undo"
          className="icon-button"
          data-tooltip="Undo"
          type="button"
          onClick={undo}
          disabled={past.length === 0}
          title="Undo"
        >
          <Icon name="undo" />
          <span className="visually-hidden">Undo</span>
        </button>
        <button
          aria-label="Redo"
          className="icon-button"
          data-tooltip="Redo"
          type="button"
          onClick={redo}
          disabled={future.length === 0}
          title="Redo"
        >
          <Icon name="redo" />
          <span className="visually-hidden">Redo</span>
        </button>
        <button
          aria-label="Delete"
          className="icon-button"
          data-tooltip="Delete"
          type="button"
          onClick={deleteSelected}
          disabled={!selection}
          title="Delete"
        >
          <Icon name="delete" />
          <span className="visually-hidden">Delete</span>
        </button>
      </div>

      <button
        aria-label="Help"
        aria-expanded={helpOpen}
        className="icon-button toolbar-help"
        data-tooltip="Help"
        type="button"
        onClick={() => setHelpOpen((open) => !open)}
        title="Help"
      >
        <Icon name="help" />
        <span className="visually-hidden">Help</span>
      </button>

      {helpOpen ? (
        <div className="help-popover" role="dialog" aria-label="Playloom help">
          <div className="help-header">
            <h2>Playloom Help</h2>
            <button
              aria-label="Close help"
              className="icon-button"
              data-tooltip="Close"
              type="button"
              onClick={() => setHelpOpen(false)}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
          <div className="help-content">
            <section>
              <h3>Canvas</h3>
              <p>Click inside a grid cell to add a default \\bullet vertex. Click the rendered math object again to edit its TeX.</p>
              <p>Drag from a vertex to another vertex to create an arrow. If the drag ends in an empty cell, Playloom creates a new \\bullet there.</p>
            </section>
            <section>
              <h3>Selection</h3>
              <p>Shift-click objects to multi-select. Drag empty canvas space to select objects and visible grid lines inside the region.</p>
              <p>Command-drag selected objects to move them. Backspace/Delete removes the current selection.</p>
            </section>
            <section>
              <h3>Tools</h3>
              <p>Use Box, Line, and Shade for boxed labels, exported structural lines, and shaded regions. Adjust style, color, arrowheads, and geometry in the Inspector.</p>
              <p>Pinch to zoom; scroll to pan when zoomed. Export TikZ from the right-side export rail.</p>
            </section>
          </div>
        </div>
      ) : null}
    </header>
  );
}
