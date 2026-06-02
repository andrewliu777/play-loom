import { useEffect, useRef, useState } from "react";
import { exportTikz } from "../export/tikzExporter";
import { serializePlayscript } from "../export/playscriptSerializer";
import { useDiagramStore } from "../store/useDiagramStore";
import { Icon } from "./Icon";

type CopyKind = "tikz" | "playscript";
type CopyState = { kind: CopyKind; status: "success" | "manual" } | null;

async function writeClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall back to the legacy path below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export function ExportPanel() {
  const { diagram, tikzPanelOpen, setTikzPanelOpen, loadDemo } = useDiagramStore();
  const [copied, setCopied] = useState<CopyState>(null);
  const tikzRef = useRef<HTMLTextAreaElement | null>(null);
  const jsonRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  if (!tikzPanelOpen) {
    return (
      <aside className="export-panel export-panel-collapsed" aria-label="Export collapsed">
        <button
          aria-label="Show export panel"
          className="open-export rail-action icon-button"
          data-tooltip="Show export"
          title="Show export panel"
          type="button"
          onClick={() => setTikzPanelOpen(true)}
        >
          <Icon name="export" />
        </button>
        <button
          aria-label="Load Demo"
          className="rail-action icon-button"
          data-tooltip="Load Demo"
          title="Load Demo"
          type="button"
          onClick={loadDemo}
        >
          <Icon name="spark" />
        </button>
      </aside>
    );
  }

  const tikz = exportTikz(diagram);
  const json = serializePlayscript(diagram);

  async function copyToClipboard(kind: CopyKind, value: string) {
    const success = await writeClipboard(value);
    if (!success) {
      const textarea = kind === "tikz" ? tikzRef.current : jsonRef.current;
      textarea?.focus();
      textarea?.select();
    }
    setCopied({ kind, status: success ? "success" : "manual" });
  }

  return (
    <aside className="export-panel">
      <div className="panel-heading">
        <h2>Export</h2>
        <div className="panel-heading-actions">
          <button
            aria-label="Load Demo"
            className="icon-button"
            data-tooltip="Load Demo"
            type="button"
            title="Load Demo"
            onClick={loadDemo}
          >
            <Icon name="spark" />
          </button>
          <button
            className="button-with-icon"
            data-tooltip="Hide export"
            type="button"
            title="Hide export"
            onClick={() => setTikzPanelOpen(false)}
          >
            <Icon name="hide" />
            Hide
          </button>
        </div>
      </div>
      <div className="export-actions">
        <button
          className="button-with-icon"
          data-tooltip="Copy TikZ"
          type="button"
          title="Copy TikZ"
          onClick={() => copyToClipboard("tikz", tikz)}
        >
          <Icon name="copy" />
          {copied?.kind === "tikz"
            ? copied.status === "success"
              ? "Copied"
              : "Selected"
            : "Copy TikZ"}
        </button>
        <button
          className="button-with-icon"
          data-tooltip="Copy Playscript"
          type="button"
          title="Copy Playscript"
          onClick={() => copyToClipboard("playscript", json)}
        >
          <Icon name="json" />
          {copied?.kind === "playscript"
            ? copied.status === "success"
              ? "Copied"
              : "Selected"
            : "Copy Playscript"}
        </button>
      </div>
      {copied ? (
        <div
          className={`copy-status ${copied.status === "manual" ? "is-manual" : ""}`}
          role="status"
          aria-live="polite"
        >
          {copied.status === "success"
            ? copied.kind === "tikz"
              ? "TikZ copied to clipboard."
              : "Playscript copied to clipboard."
            : copied.kind === "tikz"
              ? "Clipboard access is blocked; TikZ is selected. Press Cmd+C."
              : "Clipboard access is blocked; Playscript is selected. Press Cmd+C."}
        </div>
      ) : null}
      <label className="export-block">
        <span>TikZ</span>
        <textarea ref={tikzRef} readOnly value={tikz} spellCheck={false} />
      </label>
      <label className="export-block">
        <span>Playscript JSON</span>
        <textarea ref={jsonRef} readOnly value={json} spellCheck={false} />
      </label>
    </aside>
  );
}
