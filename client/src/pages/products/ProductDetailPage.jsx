import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../../components/Spinner";
import ErrorState from "../../components/ErrorState";
import EmptyState from "../../components/EmptyState";
import Breadcrumbs from "../../components/Breadcrumbs";
import SpotlightCard from "../../components/SpotlightCard";
import Badge from "../../components/Badge";
import { WarningIcon } from "../../components/icons";
import { useToast } from "../../context/ToastContext";

const CAN_WRITE_ROLES = ["ADMIN", "WAREHOUSE"];

export default function ProductDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canWrite = CAN_WRITE_ROLES.includes(user?.role);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [movements, setMovements] = useState([]);

  const [quantity, setQuantity] = useState("");
  const [type, setType] = useState("IN");
  const [reason, setReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  function loadProduct() {
    return api.get(`/products/${id}`).then((res) => setProduct(res.data.product));
  }

  function loadMovements() {
    return api.get(`/products/${id}/movements`).then((res) => setMovements(res.data.data));
  }

  function loadAll() {
    setLoading(true);
    setError("");
    return Promise.all([loadProduct(), loadMovements()])
      .catch(() => setError("Failed to load product."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAdjustStock(event) {
    event.preventDefault();
    setAdjusting(true);
    setAdjustError("");
    try {
      await api.post(`/products/${id}/stock-movements`, { quantity: Number(quantity), type, reason });
      setQuantity("");
      setReason("");
      showToast(type === "IN" ? "Stock added" : "Stock removed");
      await Promise.all([loadProduct(), loadMovements()]);
    } catch (err) {
      setAdjustError(err.response?.data?.error ?? "Failed to adjust stock.");
    } finally {
      setAdjusting(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={loadAll} />;
  if (!product) return null;

  return (
    <div className="max-w-3xl">
      <Breadcrumbs
        items={[{ label: "Dashboard", to: "/" }, { label: "Products", to: "/products" }, { label: product.name }]}
      />
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{product.name}</h1>
        {canWrite && (
          <Link
            to={`/products/${id}/edit`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 shadow-sm transition-transform duration-100 hover:bg-gray-100 active:scale-95"
          >
            Edit
          </Link>
        )}
      </div>

      <SpotlightCard className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-6 sm:grid-cols-2">
        <Detail label="SKU" value={product.sku} />
        <Detail label="Category" value={<Badge>{product.category}</Badge>} />
        <Detail label="Unit Price" value={`₹${product.unitPrice}`} />
        <Detail label="Location" value={product.location} />
        <Detail
          label="Current Stock"
          value={
            <>
              {product.currentStock}
              {product.isLowStock && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  <WarningIcon className="h-3 w-3" />
                  Low stock
                </span>
              )}
            </>
          }
        />
        <Detail label="Min Stock Alert" value={product.minStockAlert} />
      </dl>
      </SpotlightCard>

      {canWrite && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold tracking-tight text-gray-900">Adjust Stock</h2>
          <form onSubmit={handleAdjustStock} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                className="mt-1 w-28 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <input
                type="text"
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={adjusting}
              className="rounded-md bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 hover:from-indigo-700 hover:to-indigo-600 active:scale-95 disabled:opacity-50"
            >
              {adjusting ? "Saving..." : "Apply"}
            </button>
          </form>
          {adjustError && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{adjustError}</p>}
        </div>
      )}

      <h2 className="mb-2 text-lg font-semibold tracking-tight text-gray-900">Movement History</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Type</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Quantity</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Reason</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">By</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {movements.map((movement, idx) => (
              <tr key={movement.id} className={idx % 2 === 1 ? "bg-gray-50/50" : undefined}>
                <td className="px-4 py-2.5">
                  <Badge variant={movement.type === "IN" ? "green" : "red"}>{movement.type}</Badge>
                </td>
                <td className="px-4 py-2.5 text-gray-700">{movement.quantity}</td>
                <td className="px-4 py-2.5 text-gray-700">{movement.reason}</td>
                <td className="px-4 py-2.5 text-gray-700">{movement.createdBy.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{new Date(movement.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState message="No stock movements yet." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value}</dd>
    </div>
  );
}
