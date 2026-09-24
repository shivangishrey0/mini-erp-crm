import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";
import { staggerContainer, staggerItem } from "../lib/motionVariants";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Pagination from "../components/Pagination";
import TableSkeleton from "../components/TableSkeleton";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { PlusIcon, SearchIcon, WarningIcon, InventoryIcon } from "../components/icons";

const CAN_WRITE_ROLES = ["ADMIN", "OPERATIONS"];

export default function InventoryListPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const canWrite = CAN_WRITE_ROLES.includes(user?.role);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [locationId, setLocationId] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], pagination: { page: 1, totalPages: 1 } });
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadCounter, setReloadCounter] = useState(0);
  const [adjustTarget, setAdjustTarget] = useState(null);

  const productId = searchParams.get("productId") || undefined;

  useEffect(() => {
    api.get("/locations").then((res) => setLocations(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    api
      .get("/inventory", {
        params: {
          page,
          search: debouncedSearch || undefined,
          locationId: locationId || undefined,
          lowStock: lowStockOnly || undefined,
          productId,
        },
      })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load inventory.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, locationId, lowStockOnly, productId, reloadCounter]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inventory</h1>
        {canWrite && (
          <Link
            to="/products/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-indigo-600 to-indigo-500 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 hover:from-indigo-700 hover:to-indigo-600 active:scale-95"
          >
            <PlusIcon className="h-4 w-4" />
            Add Item
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by item name or SKU..."
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={locationId}
          onChange={(event) => {
            setPage(1);
            setLocationId(event.target.value);
          }}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
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

      {loading && <TableSkeleton columns={7} />}
      {!loading && error && <ErrorState message={error} onRetry={() => setReloadCounter((c) => c + 1)} />}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Item</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Category</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Location</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Batch</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Physical</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Reserved</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Available</th>
                {canWrite && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <motion.tbody variants={staggerContainer} initial="hidden" animate="show" className="divide-y divide-gray-100">
              {data.data.map((record, idx) => (
                <motion.tr
                  key={record.id}
                  variants={staggerItem}
                  className={
                    record.isLowStock
                      ? "bg-red-50 hover:bg-red-100"
                      : idx % 2 === 1
                        ? "bg-gray-50/50 hover:bg-gray-100/70"
                        : "hover:bg-gray-50"
                  }
                >
                  <td className="px-4 py-2.5">
                    <Link to={`/products/${record.product.id}`} className="font-medium text-indigo-600 hover:underline">
                      {record.product.name}
                    </Link>
                    <div className="text-xs text-gray-500">{record.product.sku}</div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{record.product.category}</td>
                  <td className="px-4 py-2.5 text-gray-700">{record.location.name}</td>
                  <td className="px-4 py-2.5 text-gray-700">{record.batch}</td>
                  <td className="px-4 py-2.5 text-gray-700">{record.physicalQty}</td>
                  <td className="px-4 py-2.5 text-gray-700">{record.reservedQty}</td>
                  <td className="px-4 py-2.5">
                    <span className={record.isLowStock ? "font-medium text-red-600" : "text-gray-700"}>
                      {record.availableQty}
                    </span>
                    {record.isLowStock && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        <WarningIcon className="h-3 w-3" />
                        Low
                      </span>
                    )}
                  </td>
                  {canWrite && (
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setAdjustTarget(record)}
                        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm transition-transform duration-100 hover:bg-gray-100 active:scale-95"
                      >
                        Adjust
                      </button>
                    </td>
                  )}
                </motion.tr>
              ))}
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={canWrite ? 8 : 7}>
                    <EmptyState icon={InventoryIcon} message="No inventory records found." />
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

      <AdjustModal
        record={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onSaved={() => {
          setAdjustTarget(null);
          showToast("Stock adjusted");
          setReloadCounter((c) => c + 1);
        }}
      />
    </div>
  );
}

function AdjustModal({ record, onClose, onSaved }) {
  const [quantity, setQuantity] = useState("");
  const [type, setType] = useState("IN");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (record) {
      setQuantity("");
      setType("IN");
      setReason("");
      setError("");
    }
  }, [record]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/inventory/adjust", {
        productId: record.product.id,
        locationId: record.location.id,
        batch: record.batch,
        quantity: Number(quantity),
        type,
        reason,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error ?? "Failed to adjust stock.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {record && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-gray-900/40"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.15 } }}
            transition={{ type: "spring", bounce: 0.25, duration: 0.35 }}
            className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Adjust Stock</h2>
            <p className="mt-1 text-sm text-gray-600">
              {record.product.name} &middot; {record.location.name} &middot; batch {record.batch}
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-transform duration-100 hover:bg-gray-100 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Apply"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
