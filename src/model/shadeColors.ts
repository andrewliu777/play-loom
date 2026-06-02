export const DEFAULT_SHADE_OPACITY = 0.68;

export const shadeColorPresets = [
  { label: "Gray", fill: "gray!20" },
  { label: "Blue", fill: "blue!12" },
  { label: "Cyan", fill: "cyan!14" },
  { label: "Green", fill: "green!14" },
  { label: "Yellow", fill: "yellow!22" },
  { label: "Red", fill: "red!12" },
  { label: "Purple", fill: "purple!12" },
] as const;

export const objectColorPresets = [
  { label: "Black", color: "#16181C" },
  { label: "Gray", color: "gray!70" },
  { label: "Blue", color: "blue!75" },
  { label: "Cyan", color: "cyan!70" },
  { label: "Green", color: "green!65" },
  { label: "Red", color: "red!70" },
  { label: "Purple", color: "purple!70" },
] as const;

const baseColors: Record<string, [number, number, number]> = {
  black: [22, 24, 28],
  gray: [128, 128, 128],
  blue: [38, 95, 153],
  cyan: [0, 150, 170],
  green: [71, 141, 92],
  yellow: [210, 156, 36],
  orange: [220, 126, 38],
  red: [192, 72, 72],
  purple: [126, 86, 180],
};

function toHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, "0");
}

function mixWithWhite([red, green, blue]: [number, number, number], percent: number): string {
  const amount = Math.max(0, Math.min(100, percent)) / 100;
  return `#${toHex(255 + (red - 255) * amount)}${toHex(255 + (green - 255) * amount)}${toHex(255 + (blue - 255) * amount)}`;
}

export function tikzFillToCss(fill: string): string {
  const trimmed = fill.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed;
  }

  const baseOnly = baseColors[trimmed.toLowerCase()];
  if (baseOnly) {
    return `#${toHex(baseOnly[0])}${toHex(baseOnly[1])}${toHex(baseOnly[2])}`;
  }

  const match = /^([a-zA-Z]+)!(\d+(?:\.\d+)?)$/.exec(trimmed);
  if (match) {
    const base = baseColors[match[1].toLowerCase()];
    if (base) {
      return mixWithWhite(base, Number(match[2]));
    }
  }

  return mixWithWhite(baseColors.gray, 20);
}

export function cssHexToTikzFill(hex: string): string {
  return hex.toUpperCase();
}

export function cssHexToTikzColor(hex: string): string {
  return hex.toUpperCase();
}

export function tikzColorValue(color: string): string {
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    const red = Number.parseInt(trimmed.slice(1, 3), 16);
    const green = Number.parseInt(trimmed.slice(3, 5), 16);
    const blue = Number.parseInt(trimmed.slice(5, 7), 16);
    return `{rgb,255:red,${red};green,${green};blue,${blue}}`;
  }

  return trimmed || "black";
}

export function tikzFillOption(fill: string): string {
  const trimmed = fill.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    const red = Number.parseInt(trimmed.slice(1, 3), 16);
    const green = Number.parseInt(trimmed.slice(3, 5), 16);
    const blue = Number.parseInt(trimmed.slice(5, 7), 16);
    return `fill={rgb,255:red,${red};green,${green};blue,${blue}}`;
  }

  return `fill=${trimmed || "gray!20"}`;
}
