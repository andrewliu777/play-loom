import type { Diagram } from "../model/types";

export function serializePlayscript(diagram: Diagram): string {
  return JSON.stringify(diagram, null, 2);
}

export function parsePlayscript(json: string): Diagram {
  return JSON.parse(json) as Diagram;
}
