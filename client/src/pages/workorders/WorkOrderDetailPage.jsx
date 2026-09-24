import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Spinner from "../../components/Spinner";
import ErrorState from "../../components/ErrorState";
import Breadcrumbs from "../../components/Breadcrumbs";
import SpotlightCard from "../../components/SpotlightCard";
import Badge, { WORK_ORDER_STATUS_VARIANT } from "../../components/Badge";

const CAN_ADVANCE_ROLES = ["ADMIN", "OPERATIONS"];
const NEXT_STATUS = { ASSIGNED: "IN_PROGRESS", IN_PROGRESS: "COMPLETED" };
const NEXT_LABEL = { ASSIGNED: "Start (In Progress)", IN_PROGRESS: "Complete" };

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canAdvance = CAN_ADVANCE_ROLES.includes(user?.role);

  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState("");

  function loadAll() {
    setLoading(true);
    setError("");
    return api
      .get(`/work-orders/${id}`)
      .then((res) => setWorkOrder(res.data.workOrder))
      .catch(() => setError("Failed to load work order."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAdvance() {
    const nextStatus = NEXT_STATUS[workOrder.status];
    if (!nextStatus) return;
    setAdvancing(true);
    setAdvanceError("");
    try {
      const res = await api.patch(`/work-orders/${id}/status`, { status: nextStatus });
      setWorkOrder(res.data.workOrder);
      showToast(`Work order marked ${nextStatus.replace("_", " ").toLowerCase()}`);
    } catch (err) {
      setAdvanceError(err.response?.data?.error ?? "Failed to update status.");
    } finally {
      setAdvancing(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={loadAll} />;
  if (!workOrder) return null;

  return (
    <div className="max-w-2xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Work Orders", to: "/work-orders" },
          { label: workOrder.workOrderNumber },
        ]}
      />
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{workOrder.workOrderNumber}</h1>
        <Badge variant={WORK_ORDER_STATUS_VARIANT[workOrder.status]}>{workOrder.status.replace("_", " ")}</Badge>
      </div>

      <SpotlightCard className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-6 sm:grid-cols-2">
          <Detail
            label="Item"
            value={
              <Link to={`/products/${workOrder.product.id}`} className="text-indigo-600 hover:underline">
                {workOrder.product.name}
              </Link>
            }
          />
          <Detail label="Location" value={workOrder.location.name} />
          <Detail label="Required Quantity" value={workOrder.requiredQty} />
          <Detail label="Available at Location" value={workOrder.availableAtLocation} />
          <Detail
            label="Shortage"
            value={
              workOrder.shortage > 0 ? (
                <span className="font-medium text-red-600">{workOrder.shortage}</span>
              ) : (
                <span className="text-green-600">None</span>
              )
            }
          />
          <Detail label="Assigned User" value={workOrder.assignedUser.name} />
        </dl>
      </SpotlightCard>

      {workOrder.shortage > 0 && workOrder.status !== "COMPLETED" && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This work order is short by {workOrder.shortage}. Resolve it with an{" "}
          <Link
            to={`/transfers/new?productId=${workOrder.product.id}&destinationLocationId=${workOrder.location.id}`}
            className="font-medium underline"
          >
            Internal Transfer
          </Link>{" "}
          before completing.
        </div>
      )}

      {canAdvance && workOrder.status !== "COMPLETED" && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <button
            onClick={handleAdvance}
            disabled={advancing}
            className="rounded-md bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 hover:from-indigo-700 hover:to-indigo-600 active:scale-95 disabled:opacity-50"
          >
            {advancing ? "Saving..." : NEXT_LABEL[workOrder.status]}
          </button>
          {advanceError && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{advanceError}</p>}
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
