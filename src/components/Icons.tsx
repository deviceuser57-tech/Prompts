interface IconProps { name: string; className?: string; strokeWidth?: number; }

const PATHS: Record<string, React.ReactNode> = {
  aperture: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v6.5M19.8 7.5l-5.6 3.2M19.8 16.5H13.3M12 21v-6.5M4.2 16.5l5.6-3.2M4.2 7.5h6.5" />
    </>
  ),
  send: <path d="M4 12l16-7-4.5 14L11 13l-7-1zm7 1l9-9" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </>
  ),
  check: <path d="M4.5 12.5l5 5L19.5 7" />,
  download: <path d="M12 3v11m0 0l-4.5-4.5M12 14l4.5-4.5M4 18.5h16" />,
  refresh: <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.7L4 15.5M4 20v-4.5h4.5" />,
  book: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15zM4 20.5A2.5 2.5 0 0 1 6.5 18H20M9 7.5h7M9 11h5" />,
  chat: <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.2 0-2.4-.25-3.4-.7L3 21l1.2-6A8.5 8.5 0 1 1 21 12zM8 10.5h8M8 14h5" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  slash: <path d="M15.5 4.5l-7 15M8 7.5H5.5M18.5 16.5H16" />,
  spark: <path d="M12 2.5l2.2 6.6 6.8.4-5.3 4.4 1.7 6.6L12 16.7l-5.4 3.8 1.7-6.6-5.3-4.4 6.8-.4L12 2.5z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.5" />
    </>
  ),
  bolt: <path d="M13 2.5L4.5 13.5H11l-1 8L18.5 10H12l1-7.5z" />,
  layers: <path d="M12 3l9 4.5-9 4.5-9-4.5L12 3zM4.5 12L12 15.8 19.5 12M4.5 16.5L12 20.3l7.5-3.8" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  cube: <path d="M12 2.8l8 4.4v9.6l-8 4.4-8-4.4V7.2l8-4.4zM12 12l8-4.4M12 12L4 7.6M12 12v9.2" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v3M12 18.2v3M21.2 12h-3M5.8 12h-3M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1M18.5 18.5l-2.1-2.1M7.6 7.6L5.5 5.5" />
    </>
  ),
  building: <path d="M3.5 21h17M5.5 21V5.5L12 3v18M12 8h6.5v13M8 8h1.5M8 11.5h1.5M8 15h1.5M15 11.5h1.5M15 15h1.5" />,
  pulse: <path d="M2.5 12h4l2.5-6.5 4 13L15.5 12h6" />,
  chart: <path d="M4 20V4M4 20h16M8 16v-5M12 16V7.5M16 16v-3M20 16V9.5" />,
  camera: (
    <>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.6l1.6-2.5h6.6L16.9 7h2.6A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-9z" />
      <circle cx="12" cy="13" r="3.6" />
    </>
  ),
  film: <path d="M4 4h16v16H4V4zM4 8h16M4 12h16M4 16h16M8 4v16M16 4v16" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9L5.3 5.3" />
    </>
  ),
  brush: <path d="M20 4.5c-4.5 1-9.2 4.6-11.3 8.2l3.1 3.1C15.4 13.7 19 9 20 4.5zM8.7 12.7c-1.8.3-3.2 1.7-3.2 4.3 0 1.5-1 2.5-2 2.8 1.3 1 4.8 1.4 6.6-.4 1.2-1.2 1.5-2.6 1.4-3.9l-2.8-2.8z" />,
  pen: <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1zM13.5 7.5l3 3" />,
  box: <path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5v-9zM3.5 7.5L12 12l8.5-4.5M12 12v9" />,
  wand: <path d="M5 19L15.5 8.5M14 4.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8zM19.5 9l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2zM8.5 3.5L9 4.7l1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.8-3.7 3.9-6 7.5-6s6.7 2.3 7.5 6" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="17.5" cy="5.5" r="2.6" />
      <circle cx="17.5" cy="18.5" r="2.6" />
      <path d="M8.4 10.8l6.8-4M8.4 13.2l6.8 4" />
    </>
  ),
  expand: <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />,
  shuffle: <path d="M3.5 6.5h3l11 11h3M20.5 17.5l-3 3 3-3-3-3M3.5 17.5h3l3.2-3.2M13.8 9.7l3.7-3.2h3M20.5 6.5l-3 3 3-3-3-3" />,
};

export function Icon({ name, className = "w-5 h-5", strokeWidth = 1.8 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.spark}
    </svg>
  );
}

export function StatusDot({ rank, size = "w-2.5 h-2.5" }: { rank: number; size?: string }) {
  const color = rank === 3 ? "var(--color-good)" : rank === 2 ? "var(--color-mid)" : "var(--color-low)";
  return (
    <span
      className={`inline-block rounded-full ${size}`}
      style={{ background: color, boxShadow: `0 0 6px ${color}66` }}
    />
  );
}
