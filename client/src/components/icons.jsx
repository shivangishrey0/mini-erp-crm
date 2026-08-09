// Small hand-authored icon set - no icon library dependency, just inline SVG.
// All share the same viewBox/stroke conventions so they read as one system.

const base = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function DashboardIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5" />
      <rect x="11" y="11" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

export function CustomersIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="6.5" r="3" />
      <path d="M3.5 17c.7-3.2 3.2-5 6.5-5s5.8 1.8 6.5 5" />
    </svg>
  );
}

export function ProductsIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M10 2.5 17 6.25v7.5L10 17.5 3 13.75v-7.5L10 2.5Z" />
      <path d="M3 6.25 10 10l7-3.75M10 10v7.5" />
    </svg>
  );
}

export function ChallansIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 2.5h10v14l-1.7-1.2-1.6 1.2-1.7-1.2-1.6 1.2-1.7-1.2L5 16.5v-14Z" />
      <path d="M7.3 7h5.4M7.3 10.2h5.4M7.3 13.4h3" />
    </svg>
  );
}

export function SearchIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m16.5 16.5-3.6-3.6" />
    </svg>
  );
}

export function PlusIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M10 3.5v13M3.5 10h13" />
    </svg>
  );
}

export function LogoutIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8 17H4.5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1H8" />
      <path d="M13 13.5 17 10l-4-3.5M17 10H8" />
    </svg>
  );
}

export function WarningIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M10 3 17.5 16h-15L10 3Z" />
      <path d="M10 8.5v3.2" />
      <circle cx="10" cy="14.2" r="0.15" fill="currentColor" stroke="none" />
    </svg>
  );
}
