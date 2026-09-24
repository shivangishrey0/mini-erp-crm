import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useToast } from "../../context/ToastContext";

export default function WorkOrderCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [operationsUsers, setOperationsUsers] = useState([]);

  const [locationId, setLocationId] = useState("");
  const [productId, setProductId] = useState("");
  const [requiredQty, setRequiredQty] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/locations"),
      api.get("/products", { params: { pageSize: 100 } }),
      api.get("/users", { params: { role: "OPERATIONS" } }),
    ]).then(([locRes, productRes, userRes]) => {
      setLocations(locRes.data.data);
      setProducts(productRes.data.data);
      setOperationsUsers(userRes.data.data);
    });
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await api.post("/work-orders", {
        locationId,
        productId,
        requiredQty: Number(requiredQty),
        assignedUserId,
      });
      showToast("Work order created");
      navigate(`/work-orders/${res.data.workOrder.id}`);
    } catch (err) {
      setError(err.response?.data?.error ?? "Failed to create work order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Work Orders", to: "/work-orders" }, { label: "New" }]} />
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-gray-900">New Work Order</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Location <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>
                Select a location
              </option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Item <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>
                Select an item
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Required Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={requiredQty}
              onChange={(event) => setRequiredQty(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Assigned User <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={assignedUserId}
              onChange={(event) => setAssignedUserId(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>
                Select a user
              </option>
              {operationsUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 hover:from-indigo-700 hover:to-indigo-600 active:scale-95 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Work Order"}
        </button>
      </form>
    </div>
  );
}
