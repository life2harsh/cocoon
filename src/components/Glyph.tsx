type GlyphName =
  | "archive"
  | "arrow-right"
  | "back"
  | "bell"
  | "book"
  | "brush"
  | "calendar"
  | "cloud"
  | "copy"
  | "edit"
  | "flame"
  | "grid"
  | "heart"
  | "history"
  | "home"
  | "leaf"
  | "lock"
  | "logout"
  | "more"
  | "palette"
  | "people"
  | "plus"
  | "search"
  | "settings"
  | "share"
  | "spark"
  | "star"
  | "trash";

export function Glyph({
  name,
  className = "h-5 w-5",
  filled = false,
}: {
  name: GlyphName;
  className?: string;
  filled?: boolean;
}) {
  const strokeProps = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  const common = {
    className,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };

  switch (name) {
    case "archive":
      return (
        <svg {...common} {...strokeProps}>
          <rect x="3" y="4" width="18" height="5" rx="1.5" />
          <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
          <path d="M10 13h4" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );
    case "back":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M19 12H5" />
          <path d="m11 18-6-6 6-6" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M15 17H9" />
          <path d="M18 16V11a6 6 0 1 0-12 0v5l-2 2h16z" />
        </svg>
      );
    case "book":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v15.5A2.5 2.5 0 0 0 17.5 17H4z" />
          <path d="M6.5 4A2.5 2.5 0 0 0 4 6.5V20" />
          <path d="M9 8h7" />
        </svg>
      );
    case "brush":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M9 16c0 2.2-1.8 4-4 4 0-2.2 1.8-4 4-4Z" />
          <path d="m13 6 5 5" />
          <path d="m4 19 9.5-9.5a2.1 2.1 0 0 0 0-3l-1-1a2.1 2.1 0 0 0-3 0L5 10" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common} {...strokeProps}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4" />
          <path d="M8 3v4" />
          <path d="M3 10h18" />
        </svg>
      );
    case "cloud":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M7 18a4 4 0 0 1-.8-7.9A5.5 5.5 0 0 1 17 8.5a3.5 3.5 0 0 1 .5 7H7Z" />
        </svg>
      );
    case "copy":
      return (
        <svg {...common} {...strokeProps}>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );
    case "edit":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M12 20h9" />
          <path d="m16.5 3.5 4 4L7 21H3v-4Z" />
        </svg>
      );
    case "flame":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M12 3c1 2.5 4.5 4.5 4.5 9a4.5 4.5 0 1 1-9 0c0-1.8.7-3.4 1.7-4.8" />
          <path d="M12 13c.8.8 1.5 1.6 1.5 3a1.5 1.5 0 0 1-3 0c0-.8.3-1.5 1.5-3Z" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common} {...strokeProps}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}>
          <path d="m12 20-6.2-6.1a4.7 4.7 0 1 1 6.6-6.6l-.4.4.4-.4a4.7 4.7 0 1 1 6.6 6.6Z" />
        </svg>
      );
    case "history":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "home":
      return (
        <svg {...common} {...strokeProps}>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9.8V20h14V9.8" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M6 20c0-6.6 5-12 12-14 0 7.5-5.2 12-12 14Z" />
          <path d="M6 20c1.5-3.2 4.2-5.9 8-8" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common} {...strokeProps}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M15 16l4-4-4-4" />
          <path d="M9 12h10" />
          <path d="M5 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1" />
        </svg>
      );
    case "more":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      );
    case "palette":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M12 3a9 9 0 0 0 0 18h1.2a1.8 1.8 0 0 0 0-3.6H12a2.4 2.4 0 0 1 0-4.8h3A6 6 0 0 0 12 3Z" />
          <circle cx="7.5" cy="11.5" r="1" />
          <circle cx="9.5" cy="7.5" r="1" />
          <circle cx="14.5" cy="7.5" r="1" />
        </svg>
      );
    case "people":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M16.5 19a4.5 4.5 0 0 0-9 0" />
          <circle cx="12" cy="9" r="3" />
          <path d="M21 19a4.3 4.3 0 0 0-3.6-4.2" />
          <path d="M3 19a4.3 4.3 0 0 1 3.6-4.2" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "search":
      return (
        <svg {...common} {...strokeProps}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common} {...strokeProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z" />
        </svg>
      );
    case "share":
      return (
        <svg {...common} {...strokeProps}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.8 6.8-4.1" />
          <path d="m8.6 13.2 6.8 4.1" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common} {...strokeProps}>
          <path d="m12 3 1.7 4.8L18 9.5l-4.3 1.6L12 16l-1.7-4.9L6 9.5l4.3-1.7Z" />
          <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" />
        </svg>
      );
    case "star":
      return (
        <svg {...common} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}>
          <path d="m12 3 2.8 5.6 6.2.9-4.5 4.4 1 6.1-5.5-2.9L6.5 20l1-6.1L3 9.5l6.2-.9Z" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common} {...strokeProps}>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="m18 6-1 14H7L6 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      );
    default:
      return null;
  }
}
