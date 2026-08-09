import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import Pagination from "../../components/Pagination";
import Spinner from "../../components/Spinner";
import ErrorState from "../../components/ErrorState";
import useDebouncedValue from "../../hooks/useDebouncedValue";

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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
        {CAN_WRITE_ROLES.includes(user?.role) && (
          <Link
            to="/customers/new"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add Customer
          </Link>
        )}
      </div>

      <input
        type="text"
        placeholder="Search by name, business, mobile, or email..."
        value={search}
        onChange={(event) => {
          setPage(1);
          setSearch(event.target.value);
        }}
        className="mb-4 w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      {loading && <Spinner />}
      {!loading && error && (
        <ErrorState message={error} onRetry={() => setReloadCounter((c) => c + 1)} />
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Business</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Mobile</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link to={`/customers/${customer.id}`} className="font-medium text-indigo-600 hover:underline">
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{customer.businessName}</td>
                  <td className="px-4 py-2 text-gray-700">{customer.mobile}</td>
                  <td className="px-4 py-2 text-gray-700">{customer.type}</td>
                  <td className="px-4 py-2 text-gray-700">{customer.status}</td>
                </tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No customers found.
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
