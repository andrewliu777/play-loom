import type { BoxLabelObject, FontSize } from "./types";

export function fontScale(fontSize?: FontSize): number {
  if (fontSize === "small") {
    return 0.86;
  }
  if (fontSize === "large") {
    return 1.18;
  }
  return 1;
}

export function estimateTexSvgSize(
  tex: string,
  fontSize: FontSize = "normal",
): { width: number; height: number } {
  const scale = fontScale(fontSize);

  if (tex.trim() === "\\bullet") {
    return { width: 18 * scale, height: 24 * scale };
  }

  const commandAdjustedLength = tex
    .replace(/\\[a-zA-Z]+/g, "xx")
    .replace(/[{}_^]/g, "")
    .length;

  return {
    width: Math.max(34, commandAdjustedLength * 8.5 * scale + 26),
    height: Math.max(34, 36 * scale),
  };
}

export function effectiveBoxSvgSize(
  object: BoxLabelObject,
  spacing: number,
): { width: number; height: number } {
  if (object.autoSize === false) {
    return {
      width: object.width * spacing,
      height: object.height * spacing,
    };
  }

  const textSize = estimateTexSvgSize(object.tex, object.fontSize);
  const paddingX = object.paddingX ?? 18;
  const paddingY = object.paddingY ?? 10;

  return {
    width: Math.max(object.width * spacing, textSize.width + paddingX * 2),
    height: Math.max(object.height * spacing, textSize.height + paddingY * 2),
  };
}

export function effectiveBoxGridSize(
  object: BoxLabelObject,
  spacing: number,
): { width: number; height: number } {
  const size = effectiveBoxSvgSize(object, spacing);
  return {
    width: size.width / spacing,
    height: size.height / spacing,
  };
}
