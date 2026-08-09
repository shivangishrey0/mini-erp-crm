import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import Pagination from "../../components/Pagination";
import TableSkeleton from "../../components/TableSkeleton";
import ErrorState from "../../components/ErrorState";
import EmptyState from "../../components/EmptyState";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Badge, { CUSTOMER_STATUS_VARIANT } from "../../components/Badge";
import { PlusIcon, SearchIcon, CustomersIcon } from "../../components/icons";

const CAN_WRITE_ROLES = ["ADMIN", "SALES"];

export default function CustomersListPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
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
      .get("/customers", { params: { page, search: debouncedSearch || undefined } })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load customers.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, reloadCounter]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Customers</h1>
        {CAN_WRITE_ROLES.includes(user?.role) && (
          <Link
            to="/customers/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 hover:bg-indigo-700 active:scale-95"
          >
            <PlusIcon className="h-4 w-4" />
            Add Customer
          </Link>
        )}
      </div>

      <div className="relative mb-4 max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, business, mobile, or email..."
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {loading && <TableSkeleton columns={5} />}
      {!loading && error && (
        <ErrorState message={error} onRetry={() => setReloadCounter((c) => c + 1)} />
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Business</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Mobile</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map((customer, idx) => (
                <tr key={customer.id} className={idx % 2 === 1 ? "bg-gray-50/50 hover:bg-gray-100/70" : "hover:bg-gray-50"}>
                  <td className="px-4 py-2.5">
                    <Link to={`/customers/${customer.id}`} className="font-medium text-indigo-600 hover:underline">
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{customer.businessName}</td>
                  <td className="px-4 py-2.5 text-gray-700">{customer.mobile}</td>
                  <td className="px-4 py-2.5">
                    <Badge>{customer.type}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={CUSTOMER_STATUS_VARIANT[customer.status]}>{customer.status}</Badge>
                  </td>
                </tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={CustomersIcon} message="No customers found." />
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
