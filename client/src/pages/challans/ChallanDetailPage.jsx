import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import Badge, { CHALLAN_STATUS_VARIANT } from "../../components/Badge";
import Spinner from "../../components/Spinner";
import ErrorState from "../../components/ErrorState";

const CAN_WRITE_ROLES = ["ADMIN", "SALES"];

export default function ChallanDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canWrite = CAN_WRITE_ROLES.includes(user?.role);

  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [acting, setActing] = useState(false);

  function loadChallan() {
    return api
      .get(`/challans/${id}`)
      .then((res) => setChallan(res.data.challan))
      .catch(() => setError("Failed to load challan."));
  }

  function retryLoad() {
    setLoading(true);
    setError("");
    loadChallan().finally(() => setLoading(false));
  }

  useEffect(() => {
    retryLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleConfirm() {
    setActing(true);
    setActionError("");
    try {
      await api.post(`/challans/${id}/confirm`);
      await loadChallan();
    } catch (err) {
      setActionError(err.response?.data?.error ?? "Failed to confirm challan.");
    } finally {
      setActing(false);
    }
  }

  async function handleCancel() {
    setActing(true);
    setActionError("");
    try {
      await api.post(`/challans/${id}/cancel`);
      await loadChallan();
    } catch (err) {
      setActionError(err.response?.data?.error ?? "Failed to cancel challan.");
    } finally {
      setActing(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={retryLoad} />;
  if (!challan) return null;

  const total = challan.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{challan.challanNumber}</h1>
          <div className="mt-1.5">
            <Badge variant={CHALLAN_STATUS_VARIANT[challan.status]}>{challan.status}</Badge>
          </div>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            {challan.status === "DRAFT" && (
              <button
                onClick={handleConfirm}
                disabled={acting}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
              >
                Confirm
              </button>
            )}
            {challan.status !== "CANCELLED" && (
              <button
                onClick={handleCancel}
                disabled={acting}
                className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition-transform duration-100 hover:bg-red-50 active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      <dl className="mb-6 grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <Detail label="Customer" value={`${challan.customer.name} — ${challan.customer.businessName}`} />
        <Detail label="Total Quantity" value={challan.totalQuantity} />
        <Detail label="Created" value={new Date(challan.createdAt).toLocaleString()} />
        <Detail label="Last Updated" value={new Date(challan.updatedAt).toLocaleString()} />
      </dl>

      <h2 className="mb-2 text-lg font-semibold tracking-tight text-gray-900">Items</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Product</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">SKU</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Unit Price</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Quantity</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {challan.items.map((item, idx) => (
              <tr key={item.id} className={idx % 2 === 1 ? "bg-gray-50/50" : undefined}>
                <td className="px-4 py-2.5 text-gray-900">{item.productName}</td>
                <td className="px-4 py-2.5 text-gray-700">{item.sku}</td>
                <td className="px-4 py-2.5 text-gray-700">₹{item.unitPrice}</td>
                <td className="px-4 py-2.5 text-gray-700">{item.quantity}</td>
                <td className="px-4 py-2.5 text-gray-700">₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 font-medium">
              <td colSpan={4} className="px-4 py-2.5 text-right text-gray-700">
                Total
              </td>
              <td className="px-4 py-2.5 text-gray-900">₹{total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}
