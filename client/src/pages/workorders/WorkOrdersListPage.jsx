import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../lib/api";
import { staggerContainer, staggerItem } from "../../lib/motionVariants";
import { useAuth } from "../../context/AuthContext";
import Pagination from "../../components/Pagination";
import TableSkeleton from "../../components/TableSkeleton";
import ErrorState from "../../components/ErrorState";
import EmptyState from "../../components/EmptyState";
import Badge, { WORK_ORDER_STATUS_VARIANT } from "../../components/Badge";
import { PlusIcon, WorkOrdersIcon } from "../../components/icons";

const CAN_CREATE_ROLES = ["ADMIN"];

export default function WorkOrdersListPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [data, setData] = useState({ data: [], pagination: { page: 1, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    api
      .get("/work-orders", { params: { page, status: status || undefined } })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load work orders.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, status, reloadCounter]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Work Orders</h1>
        {CAN_CREATE_ROLES.includes(user?.role) && (
          <Link
            to="/work-orders/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-indigo-600 to-indigo-500 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 hover:from-indigo-700 hover:to-indigo-600 active:scale-95"
          >
            <PlusIcon className="h-4 w-4" />
            New Work Order
          </Link>
        )}
      </div>

      <div className="mb-4">
        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {loading && <TableSkeleton columns={6} />}
      {!loading && error && <ErrorState message={error} onRetry={() => setReloadCounter((c) => c + 1)} />}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Work Order</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Item</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Location</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Required</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Shortage</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
              </tr>
            </thead>
            <motion.tbody variants={staggerContainer} initial="hidden" animate="show" className="divide-y divide-gray-100">
              {data.data.map((wo, idx) => (
                <motion.tr
                  key={wo.id}
                  variants={staggerItem}
                  className={idx % 2 === 1 ? "bg-gray-50/50 hover:bg-gray-100/70" : "hover:bg-gray-50"}
                >
                  <td className="px-4 py-2.5">
                    <Link to={`/work-orders/${wo.id}`} className="font-medium text-indigo-600 hover:underline">
                      {wo.workOrderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{wo.product.name}</td>
                  <td className="px-4 py-2.5 text-gray-700">{wo.location.name}</td>
                  <td className="px-4 py-2.5 text-gray-700">{wo.requiredQty}</td>
                  <td className="px-4 py-2.5">
                    {wo.shortage > 0 ? (
                      <span className="font-medium text-red-600">{wo.shortage}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={WORK_ORDER_STATUS_VARIANT[wo.status]}>{wo.status.replace("_", " ")}</Badge>
                  </td>
                </motion.tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState icon={WorkOrdersIcon} message="No work orders found." />
                  </td>
                </tr>
              )}
            </motion.tbody>
          </table>
        </div>
      )}

      {!loading && !error && (
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
