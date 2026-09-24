import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useToast } from "../../context/ToastContext";

export default function TransferCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);

  const [sourceLocationId, setSourceLocationId] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState(searchParams.get("destinationLocationId") || "");
  const [productId, setProductId] = useState(searchParams.get("productId") || "");
  const [batch, setBatch] = useState("DEFAULT");
  const [quantity, setQuantity] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/locations"), api.get("/products", { params: { pageSize: 100 } })]).then(
      ([locRes, productRes]) => {
        setLocations(locRes.data.data);
        setProducts(productRes.data.data);
      }
    );
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await api.post("/transfers", {
        sourceLocationId,
        destinationLocationId,
        productId,
        batch,
        quantity: Number(quantity),
      });
      showToast("Transfer requested");
      navigate(`/transfers/${res.data.transfer.id}`);
    } catch (err) {
      setError(err.response?.data?.error ?? "Failed to create transfer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Internal Transfers", to: "/transfers" }, { label: "New" }]} />
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-gray-900">New Internal Transfer</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <label className="block text-sm font-medium text-gray-700">Batch</label>
            <input
              type="text"
              value={batch}
              onChange={(event) => setBatch(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Source Location <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={sourceLocationId}
              onChange={(event) => setSourceLocationId(event.target.value)}
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
              Destination Location <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={destinationLocationId}
              onChange={(event) => setDestinationLocationId(event.target.value)}
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
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 hover:from-indigo-700 hover:to-indigo-600 active:scale-95 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Request Transfer"}
        </button>
      </form>
    </div>
  );
}
