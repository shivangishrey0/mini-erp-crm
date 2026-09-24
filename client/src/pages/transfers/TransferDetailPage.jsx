import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Spinner from "../../components/Spinner";
import ErrorState from "../../components/ErrorState";
import Breadcrumbs from "../../components/Breadcrumbs";
import SpotlightCard from "../../components/SpotlightCard";
import Badge, { TRANSFER_STATUS_VARIANT } from "../../components/Badge";

const CAN_ACT_ROLES = ["ADMIN", "OPERATIONS"];

export default function TransferDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canAct = CAN_ACT_ROLES.includes(user?.role);

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");

  function loadAll() {
    setLoading(true);
    setError("");
    return api
      .get(`/transfers/${id}`)
      .then((res) => setTransfer(res.data.transfer))
      .catch(() => setError("Failed to load transfer."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAction(action, successMessage) {
    setActing(true);
    setActionError("");
    try {
      const res = await api.post(`/transfers/${id}/${action}`);
      setTransfer(res.data.transfer);
      showToast(successMessage);
    } catch (err) {
      setActionError(err.response?.data?.error ?? "Action failed.");
    } finally {
      setActing(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={loadAll} />;
  if (!transfer) return null;

  return (
    <div className="max-w-2xl">
      <Breadcrumbs
        items={[{ label: "Dashboard", to: "/" }, { label: "Internal Transfers", to: "/transfers" }, { label: transfer.transferNumber }]}
      />
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{transfer.transferNumber}</h1>
        <Badge variant={TRANSFER_STATUS_VARIANT[transfer.status]}>{transfer.status}</Badge>
      </div>

      <SpotlightCard className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-6 sm:grid-cols-2">
          <Detail label="Item" value={transfer.product.name} />
          <Detail label="Batch" value={transfer.batch} />
          <Detail label="Quantity" value={transfer.quantity} />
          <Detail label="Requested By" value={transfer.requestedBy.name} />
          <Detail label="Source Location" value={transfer.sourceLocation.name} />
          <Detail label="Destination Location" value={transfer.destinationLocation.name} />
        </dl>
      </SpotlightCard>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
        <p>
          <strong>Note:</strong> destination stock only increases after receipt. Dispatch reduces the source
          immediately; the destination stays untouched until Receive is confirmed.
        </p>
      </div>

      {canAct && transfer.status !== "RECEIVED" && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {transfer.status === "REQUESTED" && (
            <button
              onClick={() => handleAction("dispatch", "Transfer dispatched")}
              disabled={acting}
              className="rounded-md bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 hover:from-indigo-700 hover:to-indigo-600 active:scale-95 disabled:opacity-50"
            >
              {acting ? "Saving..." : "Dispatch"}
            </button>
          )}
          {transfer.status === "DISPATCHED" && (
            <button
              onClick={() => handleAction("receive", "Transfer received")}
              disabled={acting}
              className="rounded-md bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 hover:from-indigo-700 hover:to-indigo-600 active:scale-95 disabled:opacity-50"
            >
              {acting ? "Saving..." : "Receive"}
            </button>
          )}
          {actionError && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>}
        </div>
      )}
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
