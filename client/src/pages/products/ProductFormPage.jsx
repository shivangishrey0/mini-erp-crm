import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/api";
import Spinner from "../../components/Spinner";

const EMPTY_FORM = { name: "", sku: "", category: "", unitPrice: "", minStockAlert: "0", location: "" };

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;

    api
      .get(`/products/${id}`)
      .then((res) => {
        const product = res.data.product;
        setForm({
          name: product.name,
          sku: product.sku,
          category: product.category,
          unitPrice: String(product.unitPrice),
          minStockAlert: String(product.minStockAlert),
          location: product.location,
        });
      })
      .catch(() => setError("Failed to load product."))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (isEdit) {
        await api.patch(`/products/${id}`, form);
        navigate(`/products/${id}`);
      } else {
        const res = await api.post("/products", form);
        navigate(`/products/${res.data.product.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error ?? "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-gray-900">{isEdit ? "Edit Product" : "Add Product"}</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" required value={form.name} onChange={(v) => updateField("name", v)} />
          <Field label="SKU" required value={form.sku} onChange={(v) => updateField("sku", v)} />
          <Field label="Category" required value={form.category} onChange={(v) => updateField("category", v)} />
          <Field
            label="Unit Price"
            type="number"
            step="0.01"
            required
            value={form.unitPrice}
            onChange={(v) => updateField("unitPrice", v)}
          />
          <Field
            label="Min Stock Alert"
            type="number"
            value={form.minStockAlert}
            onChange={(v) => updateField("minStockAlert", v)}
          />
          <Field label="Location" required value={form.location} onChange={(v) => updateField("location", v)} />
        </div>

        {!isEdit && (
          <p className="text-xs text-gray-500">
            New products start at 0 stock. Add initial stock afterward via the product's detail page.
          </p>
        )}

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-100 hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false, step }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        step={step}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}
