import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "box"
  | "copy"
  | "delete"
  | "export"
  | "hand"
  | "help"
  | "hide"
  | "json"
  | "line"
  | "redo"
  | "reverse"
  | "shade"
  | "show"
  | "spark"
  | "undo"
  | "x";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

const paths: Record<IconName, ReactNode> = {
  box: <rect x="5" y="5" width="14" height="14" rx="2" />,
  copy: (
    <>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M5 15V6a1 1 0 0 1 1-1h9" />
    </>
  ),
  delete: (
    <>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M8 10l1 9h6l1-9" />
      <path d="M10 11l4 4" />
      <path d="M14 11l-4 4" />
    </>
  ),
  export: (
    <>
      <path d="M12 4v10" />
      <path d="M8 8l4-4 4 4" />
      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </>
  ),
  hand: (
    <>
      <path d="M8 12V6a1.5 1.5 0 0 1 3 0v5" />
      <path d="M11 11V5a1.5 1.5 0 0 1 3 0v6" />
      <path d="M14 11V7a1.5 1.5 0 0 1 3 0v6" />
      <path d="M17 13v-1a1.5 1.5 0 0 1 3 0v2.5A6.5 6.5 0 0 1 13.5 21H12a5 5 0 0 1-4.2-2.3L5.2 15a1.7 1.7 0 0 1 2.6-2.1L10 15" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.4 2.4 0 0 1 4.5 1.2c0 1.8-2.3 2-2.3 3.8" />
      <path d="M12 17h.01" />
    </>
  ),
  hide: (
    <>
      <path d="M3 12s3.2-5 9-5 9 5 9 5-3.2 5-9 5-9-5-9-5Z" />
      <path d="M4 4l16 16" />
    </>
  ),
  json: (
    <>
      <path d="M8 7H6a2 2 0 0 0-2 2v1a2 2 0 0 1-1 2 2 2 0 0 1 1 2v1a2 2 0 0 0 2 2h2" />
      <path d="M16 7h2a2 2 0 0 1 2 2v1a2 2 0 0 0 1 2 2 2 0 0 0-1 2v1a2 2 0 0 1-2 2h-2" />
      <path d="M10 16l4-8" />
    </>
  ),
  line: <path d="M5 17L19 7" />,
  redo: (
    <>
      <path d="M20 7v6h-6" />
      <path d="M20 13a7 7 0 1 0-2.1 5" />
    </>
  ),
  reverse: (
    <>
      <path d="M17 7H7a4 4 0 0 0 0 8h10" />
      <path d="M14 4l3 3-3 3" />
      <path d="M10 12l-3 3 3 3" />
    </>
  ),
  shade: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="3" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h8" />
    </>
  ),
  show: (
    <>
      <path d="M3 12s3.2-5 9-5 9 5 9 5-3.2 5-9 5-9-5-9-5Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="M18 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </>
  ),
  undo: (
    <>
      <path d="M4 7v6h6" />
      <path d="M4 13a7 7 0 1 1 2.1 5" />
    </>
  ),
  x: (
    <>
      <path d="M7 7l10 10" />
      <path d="M17 7L7 17" />
    </>
  ),
};

export function Icon({ name, size = 18, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`icon ${props.className ?? ""}`.trim()}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
