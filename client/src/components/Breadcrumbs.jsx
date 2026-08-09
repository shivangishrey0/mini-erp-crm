import { Link } from "react-router-dom";

// items: [{ label, to? }] - the last item (or any item without `to`) renders
// as plain text, everything else as a link.
export default function Breadcrumbs({ items }) {
  return (
    <nav className="mb-2 flex items-center gap-1.5 text-sm text-gray-500" aria-label="Breadcrumb">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="flex items-center gap-1.5">
            {idx > 0 && <span className="text-gray-300">/</span>}
            {!isLast && item.to ? (
              <Link to={item.to} className="transition-colors hover:text-gray-700 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-gray-700" : undefined}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
