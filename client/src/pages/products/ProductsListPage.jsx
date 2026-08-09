import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import Pagination from "../../components/Pagination";
import Spinner from "../../components/Spinner";
import ErrorState from "../../components/ErrorState";
import useDebouncedValue from "../../hooks/useDebouncedValue";

const CAN_WRITE_ROLES = ["ADMIN", "WAREHOUSE"];

export default function ProductsListPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [lowStockOnly, setLowStockOnly] = useState(false);
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
      .get("/products", { params: { page, search: debouncedSearch || undefined, lowStock: lowStockOnly || undefined } })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load products.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, lowStockOnly, reloadCounter]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Products</h1>
        {CAN_WRITE_ROLES.includes(user?.role) && (
          <Link
            to="/products/new"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add Product
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name, SKU, or category..."
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(event) => {
              setPage(1);
              setLowStockOnly(event.target.checked);
            }}
          />
          Low stock only
        </label>
      </div>

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
                <th className="px-4 py-2 text-left font-medium text-gray-500">SKU</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Category</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Price</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map((product) => (
                <tr
                  key={product.id}
                  className={product.isLowStock ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}
                >
                  <td className="px-4 py-2">
                    <Link to={`/products/${product.id}`} className="font-medium text-indigo-600 hover:underline">
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{product.sku}</td>
                  <td className="px-4 py-2 text-gray-700">{product.category}</td>
                  <td className="px-4 py-2 text-gray-700">₹{product.unitPrice}</td>
                  <td className="px-4 py-2">
                    <span className={product.isLowStock ? "font-medium text-red-600" : "text-gray-700"}>
                      {product.currentStock}
                    </span>
                    {product.isLowStock && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Low stock
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No products found.
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
