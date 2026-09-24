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

const CAN_WRITE_ROLES = ["ADMIN", "OPERATIONS"];

export default function ProductDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canWrite = CAN_WRITE_ROLES.includes(user?.role);

  const [product, setProduct] = useState(null);
  const [inventoryRecords, setInventoryRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function loadAll() {
    setLoading(true);
    setError("");
    return Promise.all([
      api.get(`/products/${id}`).then((res) => setProduct(res.data.product)),
      api.get("/inventory", { params: { productId: id, pageSize: 100 } }).then((res) => setInventoryRecords(res.data.data)),
    ])
      .catch(() => setError("Failed to load product."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
          <Detail label="Min Stock Alert" value={product.minStockAlert} />
        </dl>
      </SpotlightCard>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Stock by Location</h2>
        <Link to={`/inventory?productId=${id}`} className="text-sm font-medium text-indigo-600 hover:underline">
          Manage in Inventory
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Location</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Batch</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Physical</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Reserved</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Available</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inventoryRecords.map((record, idx) => (
              <tr key={record.id} className={idx % 2 === 1 ? "bg-gray-50/50" : undefined}>
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
                      Low stock
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {inventoryRecords.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState message="No stock recorded for this item at any location yet." />
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
