import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import ErrorState from "../components/ErrorState";
import Badge, { CHALLAN_STATUS_VARIANT } from "../components/Badge";
import { CustomersIcon, ProductsIcon, ChallansIcon, WarningIcon } from "../components/icons";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentChallans, setRecentChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    // pageSize:1 keeps these cheap - only pagination.total is needed for the
    // stat cards, not the actual rows (except the recent-challans one).
    return Promise.all([
      api.get("/customers", { params: { pageSize: 1 } }),
      api.get("/products", { params: { pageSize: 1 } }),
      api.get("/products", { params: { lowStock: true, pageSize: 1 } }),
      api.get("/challans", { params: { pageSize: 5 } }),
    ])
      .then(([customers, products, lowStock, challans]) => {
        setStats({
          customers: customers.data.pagination.total,
          products: products.data.pagination.total,
          lowStock: lowStock.data.pagination.total,
          challans: challans.data.pagination.total,
        });
        setRecentChallans(challans.data.data);
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const cards = [
    { label: "Customers", value: stats.customers, Icon: CustomersIcon, to: "/customers", accent: "bg-indigo-50 text-indigo-600" },
    { label: "Products", value: stats.products, Icon: ProductsIcon, to: "/products", accent: "bg-blue-50 text-blue-600" },
    { label: "Low Stock", value: stats.lowStock, Icon: WarningIcon, to: "/products?lowStock=true", accent: "bg-red-50 text-red-600" },
    { label: "Challans", value: stats.challans, Icon: ChallansIcon, to: "/challans", accent: "bg-green-50 text-green-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Welcome, {user?.name}</h1>
      <p className="mt-1 text-sm leading-relaxed text-gray-500">
        Here&rsquo;s what&rsquo;s happening across the operation.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, Icon, to, accent }) => (
          <Link
            key={label}
            to={to}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
          >
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </Link>
        ))}
      </div>

      <h2 className="mb-2 mt-8 text-lg font-semibold tracking-tight text-gray-900">Recent Challans</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Challan #</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Customer</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentChallans.map((challan, idx) => (
              <tr key={challan.id} className={idx % 2 === 1 ? "bg-gray-50/50 hover:bg-gray-100/70" : "hover:bg-gray-50"}>
                <td className="px-4 py-2.5">
                  <Link to={`/challans/${challan.id}`} className="font-medium text-indigo-600 hover:underline">
                    {challan.challanNumber}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-gray-700">{challan.customer.businessName}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={CHALLAN_STATUS_VARIANT[challan.status]}>{challan.status}</Badge>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{new Date(challan.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {recentChallans.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  No challans yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
