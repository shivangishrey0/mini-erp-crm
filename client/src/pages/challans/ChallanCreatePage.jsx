import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import Spinner from "../../components/Spinner";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useToast } from "../../context/ToastContext";

export default function ChallanCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/customers", { params: { pageSize: 100 } }), api.get("/products", { params: { pageSize: 100 } })])
      .then(([customersRes, productsRes]) => {
        setCustomers(customersRes.data.data);
        setProducts(productsRes.data.data);
      })
      .catch(() => setError("Failed to load customers/products."))
      .finally(() => setLoadingOptions(false));
  }, []);

  function updateItem(index, field, value) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: "", quantity: 1 }]);
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function productFor(productId) {
    return products.find((p) => p.id === productId);
  }

  const estimatedTotal = items.reduce((sum, item) => {
    const product = productFor(item.productId);
    return product ? sum + Number(product.unitPrice) * Number(item.quantity || 0) : sum;
  }, 0);

  async function handleSave(status) {
    setSaving(true);
    setError("");

    const payload = {
      customerId,
      items: items
        .filter((item) => item.productId && Number(item.quantity) > 0)
        .map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })),
      status,
    };

    try {
      const res = await api.post("/challans", payload);
      showToast(status === "CONFIRMED" ? "Challan created and confirmed" : "Challan saved as draft");
      navigate(`/challans/${res.data.challan.id}`);
    } catch (err) {
      setError(err.response?.data?.error ?? "Failed to save challan.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingOptions) return <Spinner />;

  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Challans", to: "/challans" }, { label: "New" }]} />
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-gray-900">Create Challan</h1>

      {/* Plain onSubmit preventDefault, not a real submit handler - there are
          two distinct actions (draft vs confirm), so Enter shouldn't trigger
          either implicitly. The <form> wrapper is still worth having for
          semantics/accessibility (label associations, browser autofill). */}
      <form onSubmit={(event) => event.preventDefault()} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Customer <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select a customer...</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} — {customer.businessName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Items</label>
          <div className="space-y-2">
            {items.map((item, index) => {
              const product = productFor(item.productId);
              return (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <select
                    required
                    value={item.productId}
                    onChange={(event) => updateItem(index, "productId", event.target.value)}
                    className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select a product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — {p.currentStock} in stock
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={(event) => updateItem(index, "quantity", event.target.value)}
                    className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {product && (
                    <span className="w-24 text-sm text-gray-500">
                      ₹{(Number(product.unitPrice) * Number(item.quantity || 0)).toFixed(2)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="text-sm text-red-600 transition-transform duration-100 hover:underline active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 shadow-sm transition-transform duration-100 hover:bg-gray-100 active:scale-95"
          >
            + Add another item
          </button>
        </div>

        <p className="text-sm font-medium text-gray-900">Estimated total: ₹{estimatedTotal.toFixed(2)}</p>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={saving || !customerId}
            onClick={() => handleSave("DRAFT")}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-transform duration-100 hover:bg-gray-100 active:scale-95 disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={saving || !customerId}
            onClick={() => handleSave("CONFIRMED")}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
          >
            Save &amp; Confirm
          </button>
        </div>
      </form>
    </div>
  );
}
