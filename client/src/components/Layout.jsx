import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DashboardIcon, CustomersIcon, ProductsIcon, ChallansIcon, LogoutIcon } from "./icons";

const navItems = [
  { to: "/", label: "Dashboard", Icon: DashboardIcon },
  { to: "/customers", label: "Customers", Icon: CustomersIcon },
  { to: "/products", label: "Products", Icon: ProductsIcon },
  { to: "/challans", label: "Challans", Icon: ChallansIcon },
];

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Mobile: stacked top bar (brand, scrollable nav row, user+logout row).
// md+: classic left sidebar - kept opaque/structural (not translucent), per
// the principle that permanent structural regions read as "solid" while
// temporary overlays read as translucent.
export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      <aside className="flex flex-col border-b border-gray-200 bg-white md:w-60 md:shrink-0 md:border-b-0 md:border-r md:shadow-sm">
        <div className="flex items-center gap-2 px-4 py-4 md:px-6 md:py-5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
            M
          </div>
          <span className="text-base font-bold tracking-tight text-gray-900">Mini ERP + CRM</span>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-3 py-2 md:flex-1 md:flex-col md:gap-0.5 md:space-y-0 md:overflow-visible md:border-t-0 md:py-0">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 md:flex-col md:items-stretch md:py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {initials(user?.name)}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{user?.name}</div>
              <div className="text-xs uppercase tracking-wide text-gray-500">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 shadow-sm transition-transform duration-100 hover:bg-gray-100 active:scale-95 md:mt-3 md:w-full"
          >
            <LogoutIcon className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
