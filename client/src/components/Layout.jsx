import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/customers", label: "Customers" },
  { to: "/products", label: "Products" },
  { to: "/challans", label: "Challans" },
];

// Mobile: stacked top bar (brand, scrollable nav row, user+logout row).
// md+: classic left sidebar. Real page content (Task 8) renders via Outlet.
export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      <aside className="flex flex-col border-b border-gray-200 bg-white md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-4 py-4 md:px-6 md:py-5">
          <span className="text-lg font-semibold text-gray-900">Mini ERP + CRM</span>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-3 py-2 md:flex-1 md:flex-col md:gap-0 md:space-y-1 md:overflow-visible md:border-t-0 md:py-0">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 md:flex-col md:items-stretch md:py-4">
          <div>
            <div className="text-sm font-medium text-gray-900">{user?.name}</div>
            <div className="text-xs text-gray-500">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 md:mt-3 md:w-full"
          >
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
