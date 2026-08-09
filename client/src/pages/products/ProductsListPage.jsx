import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import Pagination from "../../components/Pagination";
import Spinner from "../../components/Spinner";
import ErrorState from "../../components/ErrorState";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Badge from "../../components/Badge";
import { PlusIcon, SearchIcon, WarningIcon } from "../../components/icons";

const CAN_WRITE_ROLES = ["ADMIN", "WAREHOUSE"];

export default function ProductsListPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  // Reads the initial value from ?lowStock=true so the Dashboard's low-stock
  // stat card can deep-link here pre-filtered, not just to the plain list.
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get("lowStock") === "true");
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
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Products</h1>
        {CAN_WRITE_ROLES.includes(user?.role) && (
          <Link
            to="/products/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 hover:bg-indigo-700 active:scale-95"
          >
            <PlusIcon className="h-4 w-4" />
            Add Product
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, or category..."
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
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
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">SKU</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Category</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Price</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map((product, idx) => (
                <tr
                  key={product.id}
                  className={
                    product.isLowStock
                      ? "bg-red-50 hover:bg-red-100"
                      : idx % 2 === 1
                        ? "bg-gray-50/50 hover:bg-gray-100/70"
                        : "hover:bg-gray-50"
                  }
                >
                  <td className="px-4 py-2.5">
                    <Link to={`/products/${product.id}`} className="font-medium text-indigo-600 hover:underline">
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{product.sku}</td>
                  <td className="px-4 py-2.5">
                    <Badge>{product.category}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">₹{product.unitPrice}</td>
                  <td className="px-4 py-2.5">
                    <span className={product.isLowStock ? "font-medium text-red-600" : "text-gray-700"}>
                      {product.currentStock}
                    </span>
                    {product.isLowStock && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        <WarningIcon className="h-3 w-3" />
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
