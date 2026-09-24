import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import TableSkeleton from "../components/TableSkeleton";
import SpotlightCard from "../components/SpotlightCard";
import AnimatedCounter from "../components/AnimatedCounter";
import Badge, { ORDER_STATUS_VARIANT } from "../components/Badge";
import { CustomersIcon, InventoryIcon, WorkOrdersIcon, TransfersIcon, OrdersIcon, WarningIcon } from "../components/icons";
import { staggerContainer as cardContainer, staggerItem as cardItem } from "../lib/motionVariants";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    // pageSize:1 keeps these cheap - only pagination.total is needed for the
    // stat cards, not the actual rows (except the recent-orders one).
    return Promise.all([
      api.get("/customers", { params: { pageSize: 1 } }),
      api.get("/inventory", { params: { lowStock: true, pageSize: 1 } }),
      api.get("/work-orders", { params: { status: "ASSIGNED", pageSize: 1 } }),
      api.get("/transfers", { params: { status: "REQUESTED", pageSize: 1 } }),
      api.get("/orders", { params: { pageSize: 5 } }),
    ])
      .then(([customers, lowStock, workOrders, transfers, orders]) => {
        setStats({
          customers: customers.data.pagination.total,
          lowStock: lowStock.data.pagination.total,
          openWorkOrders: workOrders.data.pagination.total,
          pendingTransfers: transfers.data.pagination.total,
        });
        setRecentOrders(orders.data.data);
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;

  if (loading) {
    return (
      <div>
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
              <div className="h-7 w-10 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-4 w-20 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
        <div className="mb-2 mt-8 h-6 w-40 animate-pulse rounded bg-gray-200" />
        <TableSkeleton rows={3} columns={4} />
      </div>
    );
  }

  const cards = [
    { label: "Customers", value: stats.customers, Icon: CustomersIcon, to: "/customers", gradient: "from-indigo-500 to-indigo-600" },
    { label: "Low Stock", value: stats.lowStock, Icon: WarningIcon, to: "/inventory", gradient: "from-rose-500 to-red-600" },
    { label: "Open Work Orders", value: stats.openWorkOrders, Icon: WorkOrdersIcon, to: "/work-orders?status=ASSIGNED", gradient: "from-blue-500 to-blue-600" },
    { label: "Pending Transfers", value: stats.pendingTransfers, Icon: TransfersIcon, to: "/transfers?status=REQUESTED", gradient: "from-emerald-500 to-emerald-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Welcome, {user?.name}</h1>
      <p className="mt-1 text-sm leading-relaxed text-gray-500">
        Here&rsquo;s what&rsquo;s happening across the operation.
      </p>

      <motion.div
        variants={cardContainer}
        initial="hidden"
        animate="show"
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {cards.map(({ label, value, Icon, to, gradient }) => (
          <motion.div key={label} variants={cardItem}>
            <Link to={to} className="block">
              <SpotlightCard className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm ${gradient}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-gray-900">
                  <AnimatedCounter value={value} />
                </div>
                <div className="text-sm text-gray-500">{label}</div>
              </SpotlightCard>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <h2 className="mb-2 mt-8 text-lg font-semibold tracking-tight text-gray-900">Recent Customer Orders</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Order #</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Customer</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Created</th>
            </tr>
          </thead>
          <motion.tbody variants={cardContainer} initial="hidden" animate="show" className="divide-y divide-gray-100">
            {recentOrders.map((order, idx) => (
              <motion.tr
                key={order.id}
                variants={cardItem}
                className={idx % 2 === 1 ? "bg-gray-50/50 hover:bg-gray-100/70" : "hover:bg-gray-50"}
              >
                <td className="px-4 py-2.5">
                  <Link to={`/orders/${order.id}`} className="font-medium text-indigo-600 hover:underline">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-gray-700">{order.customer.businessName}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={ORDER_STATUS_VARIANT[order.status]}>{order.status}</Badge>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
              </motion.tr>
            ))}
            {recentOrders.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <EmptyState icon={OrdersIcon} message="No orders yet." />
                </td>
              </tr>
            )}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
}
