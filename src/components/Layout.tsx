import { useEffect } from "react";
import { DiagramCanvas } from "../render/DiagramCanvas";
import { useDiagramStore } from "../store/useDiagramStore";
import { ExportPanel } from "./ExportPanel";
import { Inspector } from "./Inspector";
import { Toolbar } from "./Toolbar";

export function Layout() {
  const undo = useDiagramStore((state) => state.undo);
  const redo = useDiagramStore((state) => state.redo);
  const deleteSelected = useDiagramStore((state) => state.deleteSelected);
  const selection = useDiagramStore((state) => state.selection);
  const tikzPanelOpen = useDiagramStore((state) => state.tikzPanelOpen);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (isEditing) {
        return;
      }

      if ((event.key === "Backspace" || event.key === "Delete") && selection) {
        event.preventDefault();
        deleteSelected();
        return;
      }

      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected, redo, selection, undo]);

  return (
    <div className="app-shell">
      <Toolbar />
      <main className={`workspace ${tikzPanelOpen ? "" : "is-export-collapsed"}`}>
        <DiagramCanvas />
        <Inspector />
        <ExportPanel />
      </main>
    </div>
  );
}
