import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import Pagination from "../../components/Pagination";
import Spinner from "../../components/Spinner";
import ErrorState from "../../components/ErrorState";

const CAN_WRITE_ROLES = ["ADMIN", "SALES"];
const STATUSES = ["DRAFT", "CONFIRMED", "CANCELLED"];

export default function ChallansListPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], pagination: { page: 1, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    api
      .get("/challans", { params: { page, status: status || undefined } })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load challans.");
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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Challans</h1>
        {CAN_WRITE_ROLES.includes(user?.role) && (
          <Link
            to="/challans/new"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Create Challan
          </Link>
        )}
      </div>

      <select
        value={status}
        onChange={(event) => {
          setPage(1);
          setStatus(event.target.value);
        }}
        className="mb-4 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {loading && <Spinner />}
      {!loading && error && (
        <ErrorState message={error} onRetry={() => setReloadCounter((c) => c + 1)} />
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Challan #</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Customer</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Total Qty</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map((challan) => (
                <tr key={challan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link to={`/challans/${challan.id}`} className="font-medium text-indigo-600 hover:underline">
                      {challan.challanNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{challan.customer.businessName}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={challan.status} />
                  </td>
                  <td className="px-4 py-2 text-gray-700">{challan.totalQuantity}</td>
                  <td className="px-4 py-2 text-gray-500">{new Date(challan.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No challans found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && (
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}

const STATUS_STYLES = {
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{status}</span>
  );
}
