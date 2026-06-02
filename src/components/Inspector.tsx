import type {
  Arrowhead,
  ArrowTipStyle,
  DiagramObject,
  Edge,
  EdgeEndpointSymbol,
  EdgeStyle,
  FontSize,
  LineStyle,
  LoopSide,
} from "../model/types";
import {
  cssHexToTikzColor,
  cssHexToTikzFill,
  DEFAULT_SHADE_OPACITY,
  objectColorPresets,
  shadeColorPresets,
  tikzFillToCss,
} from "../model/shadeColors";
import { useDiagramStore } from "../store/useDiagramStore";
import { Icon } from "./Icon";

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOpacity(value: string): number {
  return Math.max(0, Math.min(1, toNumber(value)));
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ColorPanel({
  title = "Color",
  value,
  onChange,
}: {
  title?: string;
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  const resolvedValue = value ?? "#16181C";

  return (
    <div className="color-panel">
      <div className="color-panel-heading">
        <span>{title}</span>
        <button type="button" onClick={() => onChange(undefined)}>
          Default
        </button>
      </div>
      <div className="color-swatch-grid" aria-label={`${title} presets`}>
        {objectColorPresets.map((preset) => (
          <button
            key={preset.color}
            aria-label={preset.label}
            className={resolvedValue === preset.color ? "is-active" : ""}
            type="button"
            title={preset.label}
            onClick={() => onChange(preset.color)}
          >
            <span style={{ background: tikzFillToCss(preset.color) }} />
          </button>
        ))}
      </div>
      <div className="field-row">
        <Field label="Picker">
          <input
            type="color"
            value={tikzFillToCss(resolvedValue)}
            onChange={(event) => onChange(cssHexToTikzColor(event.target.value))}
          />
        </Field>
        <Field label="TikZ color">
          <input value={value ?? ""} onChange={(event) => onChange(event.target.value || undefined)} />
        </Field>
      </div>
    </div>
  );
}

function objectTitle(object: DiagramObject): string {
  return object.type.replace("-", " ");
}

function loopAngleForSide(side: LoopSide): number {
  switch (side) {
    case "top":
      return 90;
    case "right":
      return 0;
    case "bottom":
      return 270;
    case "left":
      return 180;
  }
}

function ArrowTipSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ArrowTipStyle;
  onChange: (value: ArrowTipStyle) => void;
}) {
  return (
    <Field label={label}>
      <SelectWithPreview preview={<ArrowTipPreview tip={value} />}>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as ArrowTipStyle)}
        >
          <option value="stealth">stealth</option>
          <option value="latex">latex</option>
          <option value="triangle">triangle</option>
          <option value="to">to</option>
        </select>
      </SelectWithPreview>
    </Field>
  );
}

function SelectWithPreview({
  children,
  preview,
}: {
  children: React.ReactNode;
  preview: React.ReactNode;
}) {
  return (
    <div className="select-preview-row">
      <div className="select-control">{children}</div>
      <div className="select-preview" aria-hidden="true">
        {preview}
      </div>
    </div>
  );
}

function PreviewSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 42 24" focusable="false">
      {children}
    </svg>
  );
}

function LineStylePreview({ style }: { style: LineStyle | EdgeStyle }) {
  if (style === "wavy") {
    return (
      <PreviewSvg>
        <path className="preview-stroke" d="M 5 12 C 9 5, 13 19, 17 12 S 25 5, 29 12 S 37 19, 39 12" />
      </PreviewSvg>
    );
  }

  if (style === "double" || style === "double-dashed") {
    const dash = style === "double-dashed" ? "5 4" : undefined;
    return (
      <PreviewSvg>
        <line className="preview-stroke" x1="5" y1="9" x2="37" y2="9" strokeDasharray={dash} />
        <line className="preview-stroke" x1="5" y1="15" x2="37" y2="15" strokeDasharray={dash} />
      </PreviewSvg>
    );
  }

  const dash = style === "solid" ? undefined : style === "dotted" ? "1 4" : "5 4";
  return (
    <PreviewSvg>
      <line
        className={style === "guide" ? "preview-stroke preview-guide" : "preview-stroke"}
        x1="5"
        y1="12"
        x2="37"
        y2="12"
        strokeDasharray={dash}
      />
    </PreviewSvg>
  );
}

function ArrowheadPreview({ value }: { value: Arrowhead }) {
  return (
    <PreviewSvg>
      <line className="preview-stroke" x1="7" y1="12" x2="35" y2="12" />
      {value === "start" || value === "both" ? (
        <path className="preview-fill" d="M 7 12 L 14 8 L 14 16 Z" />
      ) : null}
      {value === "end" || value === "both" ? (
        <path className="preview-fill" d="M 35 12 L 28 8 L 28 16 Z" />
      ) : null}
    </PreviewSvg>
  );
}

function EndpointSymbolPreview({
  symbol,
  position,
}: {
  symbol: EdgeEndpointSymbol;
  position: "start" | "end";
}) {
  const x = position === "start" ? 8 : 34;
  return (
    <PreviewSvg>
      <line className="preview-stroke" x1="8" y1="12" x2="34" y2="12" />
      {symbol === "arrow" ? (
        position === "start" ? (
          <path className="preview-fill" d="M 8 12 L 15 8 L 15 16 Z" />
        ) : (
          <path className="preview-fill" d="M 34 12 L 27 8 L 27 16 Z" />
        )
      ) : null}
      {symbol === "bar" ? (
        <line className="preview-stroke preview-heavy" x1={x} y1="6" x2={x} y2="18" />
      ) : null}
      {symbol === "dot" ? <circle className="preview-fill" cx={x} cy="12" r="3.2" /> : null}
    </PreviewSvg>
  );
}

function ArrowTipPreview({ tip }: { tip: ArrowTipStyle }) {
  return (
    <PreviewSvg>
      <line className="preview-stroke" x1="7" y1="12" x2="33" y2="12" />
      {tip === "to" ? (
        <path className="preview-stroke" d="M 27 7 L 34 12 L 27 17" />
      ) : null}
      {tip === "stealth" ? <path className="preview-fill" d="M 35 12 L 26 7 L 29 12 L 26 17 Z" /> : null}
      {tip === "latex" ? <path className="preview-fill" d="M 35 12 L 25 6 L 28 12 L 25 18 Z" /> : null}
      {tip === "triangle" ? <path className="preview-fill" d="M 35 12 L 25 6 L 25 18 Z" /> : null}
    </PreviewSvg>
  );
}

function OrientationPreview({ orientation }: { orientation: "horizontal" | "vertical" }) {
  return (
    <PreviewSvg>
      {orientation === "horizontal" ? (
        <line className="preview-stroke" x1="7" y1="12" x2="35" y2="12" />
      ) : (
        <line className="preview-stroke" x1="21" y1="4" x2="21" y2="20" />
      )}
    </PreviewSvg>
  );
}

export function Inspector() {
  const { diagram, selection, updateObject, updateEdge } = useDiagramStore();
  const selectedObject =
    selection?.kind === "object"
      ? diagram.objects.find((object) => object.id === selection.id)
      : null;
  const selectedEdge =
    selection?.kind === "edge" ? diagram.edges.find((edge) => edge.id === selection.id) : null;
  const selectedObjectCount = selection?.kind === "objects" ? selection.ids.length : 0;

  if (!selectedObject && !selectedEdge && selectedObjectCount === 0) {
    return (
      <aside className="inspector">
        <h2>Inspector</h2>
        <p className="empty-state">Select an object, guide, shade, or edge.</p>
      </aside>
    );
  }

  return (
    <aside className="inspector">
      <h2>Inspector</h2>
      {selectedObject ? (
        <ObjectInspector object={selectedObject} onChange={updateObject} />
      ) : null}
      {selectedObjectCount > 0 ? (
        <div className="inspector-section">
          <div className="selection-heading">
            <strong>{selectedObjectCount} objects selected</strong>
            <code>group</code>
          </div>
          <p className="empty-state">Drag any selected object to move the group.</p>
        </div>
      ) : null}
      {selectedEdge ? (
        <EdgeInspector
          edge={selectedEdge}
          isSelfLoop={selectedEdge.from === selectedEdge.to}
          onChange={updateEdge}
        />
      ) : null}
    </aside>
  );
}

function ObjectInspector({
  object,
  onChange,
}: {
  object: DiagramObject;
  onChange: (id: string, patch: Partial<DiagramObject>) => void;
}) {
  return (
    <div className="inspector-section">
      <div className="selection-heading">
        <strong>{objectTitle(object)}</strong>
        <code>{object.id}</code>
      </div>

      {"x" in object && "y" in object ? (
        <div className="field-row">
          <Field label="x">
            <input
              type="number"
              step="0.25"
              value={object.x}
              onChange={(event) => onChange(object.id, { x: toNumber(event.target.value) } as Partial<DiagramObject>)}
            />
          </Field>
          <Field label="y">
            <input
              type="number"
              step="0.25"
              value={object.y}
              onChange={(event) => onChange(object.id, { y: toNumber(event.target.value) } as Partial<DiagramObject>)}
            />
          </Field>
        </div>
      ) : null}

      {object.type === "math-label" ? (
        <>
          <Field label="TeX">
            <input
              value={object.tex}
              onChange={(event) => onChange(object.id, { tex: event.target.value })}
            />
          </Field>
          <div className="field-row">
            <Field label="x offset">
              <input
                type="number"
                value={object.xOffset ?? 0}
                onChange={(event) => onChange(object.id, { xOffset: toNumber(event.target.value) })}
              />
            </Field>
            <Field label="y offset">
              <input
                type="number"
                value={object.yOffset ?? 0}
                onChange={(event) => onChange(object.id, { yOffset: toNumber(event.target.value) })}
              />
            </Field>
          </div>
          <Field label="Font size">
            <select
              value={object.fontSize}
              onChange={(event) => onChange(object.id, { fontSize: event.target.value as FontSize })}
            >
              <option value="small">small</option>
              <option value="normal">normal</option>
              <option value="large">large</option>
            </select>
          </Field>
          <ColorPanel
            value={object.color}
            onChange={(color) => onChange(object.id, { color })}
          />
        </>
      ) : null}

      {object.type === "dot-node" ? (
        <Field label="Radius">
          <input
            type="number"
            value={object.radius}
            onChange={(event) => onChange(object.id, { radius: toNumber(event.target.value) })}
          />
        </Field>
      ) : null}

      {object.type === "box-label" ? (
        <>
          <Field label="TeX">
            <input
              value={object.tex}
              onChange={(event) => onChange(object.id, { tex: event.target.value })}
            />
          </Field>
          <div className="field-row">
            <Field label="Width">
              <input
                type="number"
                step="0.25"
                value={object.width}
                onChange={(event) => onChange(object.id, { width: toNumber(event.target.value) })}
              />
            </Field>
            <Field label="Height">
              <input
                type="number"
                step="0.25"
                value={object.height}
                onChange={(event) => onChange(object.id, { height: toNumber(event.target.value) })}
              />
            </Field>
          </div>
          <label className="check-field">
            <input
              type="checkbox"
              checked={Boolean(object.rounded)}
              onChange={(event) => onChange(object.id, { rounded: event.target.checked })}
            />
            <span>Rounded box</span>
          </label>
          <ColorPanel
            value={object.color}
            onChange={(color) => onChange(object.id, { color })}
          />
        </>
      ) : null}

      {object.type === "shade-region" ? (
        <>
          <div className="field-row">
            <Field label="Width">
              <input
                type="number"
                step="0.25"
                value={object.width}
                onChange={(event) => onChange(object.id, { width: toNumber(event.target.value) })}
              />
            </Field>
            <Field label="Height">
              <input
                type="number"
                step="0.25"
                value={object.height}
                onChange={(event) => onChange(object.id, { height: toNumber(event.target.value) })}
              />
            </Field>
          </div>
          <div className="color-panel">
            <div className="color-panel-heading">
              <span>Color</span>
              <span>{Math.round((object.opacity ?? DEFAULT_SHADE_OPACITY) * 100)}%</span>
            </div>
            <div className="color-swatch-grid" aria-label="Shade colors">
              {shadeColorPresets.map((preset) => (
                <button
                  key={preset.fill}
                  aria-label={preset.label}
                  className={object.fill === preset.fill ? "is-active" : ""}
                  type="button"
                  title={preset.label}
                  onClick={() => onChange(object.id, { fill: preset.fill })}
                >
                  <span style={{ background: tikzFillToCss(preset.fill) }} />
                </button>
              ))}
            </div>
            <div className="field-row">
              <Field label="Picker">
                <input
                  type="color"
                  value={tikzFillToCss(object.fill)}
                  onChange={(event) =>
                    onChange(object.id, { fill: cssHexToTikzFill(event.target.value) })
                  }
                />
              </Field>
              <Field label="TikZ fill">
                <input
                  value={object.fill}
                  onChange={(event) => onChange(object.id, { fill: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Opacity">
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={object.opacity ?? DEFAULT_SHADE_OPACITY}
                onChange={(event) =>
                  onChange(object.id, { opacity: toOpacity(event.target.value) })
                }
              />
            </Field>
          </div>
          <Field label="Rounded corners">
            <input
              value={object.roundedCorners ?? ""}
              onChange={(event) => onChange(object.id, { roundedCorners: event.target.value })}
            />
          </Field>
        </>
      ) : null}

      {object.type === "grid-line" ? (
        <>
          <Field label="Orientation">
            <SelectWithPreview preview={<OrientationPreview orientation={object.orientation} />}>
              <select
                value={object.orientation}
                onChange={(event) =>
                  onChange(object.id, {
                    orientation: event.target.value as "horizontal" | "vertical",
                  })
                }
              >
                <option value="horizontal">horizontal</option>
                <option value="vertical">vertical</option>
              </select>
            </SelectWithPreview>
          </Field>
          <div className="field-row">
            <Field label="Position">
              <input
                type="number"
                step="0.25"
                value={object.position}
                onChange={(event) => onChange(object.id, { position: toNumber(event.target.value) })}
              />
            </Field>
            <Field label="Start">
              <input
                type="number"
                step="0.25"
                value={object.start}
                onChange={(event) => onChange(object.id, { start: toNumber(event.target.value) })}
              />
            </Field>
          </div>
          <Field label="End">
            <input
              type="number"
              step="0.25"
              value={object.end}
              onChange={(event) => onChange(object.id, { end: toNumber(event.target.value) })}
            />
          </Field>
          <Field label="Style">
            <SelectWithPreview preview={<LineStylePreview style={object.style} />}>
              <select
                value={object.style}
                onChange={(event) => onChange(object.id, { style: event.target.value as LineStyle })}
              >
                <option value="solid">solid</option>
                <option value="dashed">dashed</option>
                <option value="dotted">dotted</option>
                <option value="guide">guide</option>
                <option value="double">double</option>
                <option value="double-dashed">double dashed</option>
              </select>
            </SelectWithPreview>
          </Field>
          <Field label="Arrowhead">
            <SelectWithPreview preview={<ArrowheadPreview value={object.arrowhead} />}>
              <select
                value={object.arrowhead}
                onChange={(event) => onChange(object.id, { arrowhead: event.target.value as Arrowhead })}
              >
                <option value="none">none</option>
                <option value="end">end</option>
                <option value="start">start</option>
                <option value="both">both</option>
              </select>
            </SelectWithPreview>
          </Field>
        </>
      ) : null}

      {object.type === "ellipsis" ? (
        <Field label="Orientation">
          <select
            value={object.orientation}
            onChange={(event) =>
              onChange(object.id, {
                orientation: event.target.value as "horizontal" | "vertical",
              })
            }
          >
            <option value="horizontal">horizontal</option>
            <option value="vertical">vertical</option>
          </select>
        </Field>
      ) : null}
    </div>
  );
}

function EdgeInspector({
  edge,
  isSelfLoop,
  onChange,
}: {
  edge: Edge;
  isSelfLoop: boolean;
  onChange: (id: string, patch: Partial<Edge>) => void;
}) {
  const startSymbol = edge.startSymbol ?? "none";
  const endSymbol = edge.endSymbol ?? (edge.arrowhead ? "arrow" : "none");
  const shortenStart = edge.shortenStart ?? 3;
  const shortenEnd = edge.shortenEnd ?? 4;
  const length = Math.max(0, 100 - shortenStart - shortenEnd);
  const loopAngle = edge.loopAngle ?? loopAngleForSide(edge.loopSide ?? "top");

  function setLength(value: number) {
    const totalShorten = Math.max(0, 100 - value);
    onChange(edge.id, {
      shortenStart: Math.round(totalShorten / 2),
      shortenEnd: Math.round(totalShorten / 2),
    });
  }

  function reverseEdge() {
    onChange(edge.id, {
      from: edge.to,
      to: edge.from,
      startSymbol: endSymbol === "arrow" && !edge.endSymbol ? "none" : endSymbol,
      endSymbol: startSymbol,
      startArrowTip: edge.endArrowTip,
      endArrowTip: edge.startArrowTip,
      arrowhead: startSymbol === "arrow",
      shortenStart: shortenEnd,
      shortenEnd: shortenStart,
      offset: -(edge.offset ?? 0),
    });
  }

  return (
    <div className="inspector-section">
      <div className="selection-heading">
        <strong>edge</strong>
        <code>{edge.id}</code>
      </div>

      <button
        className="button-with-icon"
        data-tooltip="Reverse edge"
        type="button"
        title="Reverse edge"
        onClick={reverseEdge}
      >
        <Icon name="reverse" />
        Reverse
      </button>

      <div className="field-row">
        <Field label="Tail">
          <SelectWithPreview preview={<EndpointSymbolPreview symbol={startSymbol} position="start" />}>
            <select
              value={startSymbol}
              onChange={(event) =>
                onChange(edge.id, {
                  startSymbol: event.target.value as EdgeEndpointSymbol,
                })
              }
            >
              <option value="none">none</option>
              <option value="arrow">arrow</option>
              <option value="bar">bar</option>
              <option value="dot">dot</option>
            </select>
          </SelectWithPreview>
        </Field>
        <Field label="Head">
          <SelectWithPreview preview={<EndpointSymbolPreview symbol={endSymbol} position="end" />}>
            <select
              value={endSymbol}
              onChange={(event) => {
                const value = event.target.value as EdgeEndpointSymbol;
                onChange(edge.id, {
                  endSymbol: value,
                  arrowhead: value === "arrow",
                });
              }}
            >
              <option value="none">none</option>
              <option value="arrow">arrow</option>
              <option value="bar">bar</option>
              <option value="dot">dot</option>
            </select>
          </SelectWithPreview>
        </Field>
      </div>

      {startSymbol === "arrow" || endSymbol === "arrow" ? (
        <div className="field-row">
          {startSymbol === "arrow" ? (
            <ArrowTipSelect
              label="Tail type"
              value={edge.startArrowTip ?? "stealth"}
              onChange={(value) => onChange(edge.id, { startArrowTip: value })}
            />
          ) : null}
          {endSymbol === "arrow" ? (
            <ArrowTipSelect
              label="Head type"
              value={edge.endArrowTip ?? "stealth"}
              onChange={(value) => onChange(edge.id, { endArrowTip: value })}
            />
          ) : null}
        </div>
      ) : null}

      <Field label="Style">
        <SelectWithPreview preview={<LineStylePreview style={edge.style} />}>
          <select
            value={edge.style}
            onChange={(event) => onChange(edge.id, { style: event.target.value as EdgeStyle })}
          >
            <option value="solid">solid</option>
            <option value="dashed">dashed</option>
            <option value="guide">guide</option>
            <option value="wavy">wavy</option>
            <option value="double">double</option>
            <option value="double-dashed">double dashed</option>
          </select>
        </SelectWithPreview>
      </Field>

      <ColorPanel
        value={edge.color}
        onChange={(color) => onChange(edge.id, { color })}
      />

      <Field label={`Position ${edge.labelPosition ?? 50}`}>
        <input
          type="range"
          min="0"
          max="100"
          value={edge.labelPosition ?? 50}
          onChange={(event) =>
            onChange(edge.id, { labelPosition: toNumber(event.target.value) })
          }
        />
      </Field>

      {isSelfLoop ? (
        <>
          <Field label="Loop side">
            <select
              value={edge.loopSide ?? "top"}
              onChange={(event) =>
                onChange(edge.id, {
                  loopSide: event.target.value as LoopSide,
                  loopAngle: loopAngleForSide(event.target.value as LoopSide),
                })
              }
            >
              <option value="top">top</option>
              <option value="right">right</option>
              <option value="bottom">bottom</option>
              <option value="left">left</option>
            </select>
          </Field>

          <Field label={`Loop angle ${loopAngle}deg`}>
            <input
              type="range"
              min="0"
              max="359"
              value={loopAngle}
              onChange={(event) =>
                onChange(edge.id, {
                  loopAngle: toNumber(event.target.value),
                })
              }
            />
          </Field>

          <Field label={`Loop curve ${edge.loopSize ?? 34}`}>
            <input
              type="range"
              min="18"
              max="90"
              value={edge.loopSize ?? 34}
              onChange={(event) =>
                onChange(edge.id, { loopSize: toNumber(event.target.value) })
              }
            />
          </Field>
        </>
      ) : (
        <>
          <Field label={`Offset ${edge.offset ?? 0}`}>
            <input
              type="range"
              min="-36"
              max="36"
              value={edge.offset ?? 0}
              onChange={(event) => onChange(edge.id, { offset: toNumber(event.target.value) })}
            />
          </Field>

          <Field label={`Curve ${edge.bend ?? 0}`}>
            <input
              type="range"
              min="-80"
              max="80"
              value={edge.bend ?? 0}
              onChange={(event) => onChange(edge.id, { bend: toNumber(event.target.value) })}
            />
          </Field>
        </>
      )}

      <Field label={`Length ${length}`}>
        <input
          type="range"
          min="20"
          max="100"
          value={length}
          onChange={(event) => setLength(toNumber(event.target.value))}
        />
      </Field>

      <div className="field-row">
        <Field label="Shorten start">
          <input
            type="number"
            value={shortenStart}
            onChange={(event) => onChange(edge.id, { shortenStart: toNumber(event.target.value) })}
          />
        </Field>
        <Field label="Shorten end">
          <input
            type="number"
            value={shortenEnd}
            onChange={(event) => onChange(edge.id, { shortenEnd: toNumber(event.target.value) })}
          />
        </Field>
      </div>
    </div>
  );
}
