import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/api";

const EMPTY_FORM = {
  name: "",
  mobile: "",
  email: "",
  businessName: "",
  gstNumber: "",
  type: "RETAIL",
  address: "",
  status: "LEAD",
  followUpDate: "",
  notes: "",
};

export default function CustomerFormPage() {
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
      .get(`/customers/${id}`)
      .then((res) => {
        const customer = res.data.customer;
        setForm({
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email ?? "",
          businessName: customer.businessName,
          gstNumber: customer.gstNumber ?? "",
          type: customer.type,
          address: customer.address,
          status: customer.status,
          followUpDate: customer.followUpDate ? customer.followUpDate.slice(0, 10) : "",
          notes: customer.notes ?? "",
        });
      })
      .catch(() => setError("Failed to load customer."))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    // Empty-string optional fields shouldn't be sent as "" - omit them so
    // the backend's zod .optional() schemas treat them as not provided.
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, value]) => value !== "")
    );

    try {
      if (isEdit) {
        await api.patch(`/customers/${id}`, payload);
        navigate(`/customers/${id}`);
      } else {
        const res = await api.post("/customers", payload);
        navigate(`/customers/${res.data.customer.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error ?? "Failed to save customer.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">{isEdit ? "Edit Customer" : "Add Customer"}</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" required value={form.name} onChange={(v) => updateField("name", v)} />
          <Field label="Mobile" required value={form.mobile} onChange={(v) => updateField("mobile", v)} />
          <Field label="Email" type="email" value={form.email} onChange={(v) => updateField("email", v)} />
          <Field
            label="Business Name"
            required
            value={form.businessName}
            onChange={(v) => updateField("businessName", v)}
          />
          <Field label="GST Number" value={form.gstNumber} onChange={(v) => updateField("gstNumber", v)} />
          <SelectField
            label="Type"
            required
            value={form.type}
            onChange={(v) => updateField("type", v)}
            options={["RETAIL", "WHOLESALE", "DISTRIBUTOR"]}
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(v) => updateField("status", v)}
            options={["LEAD", "ACTIVE", "INACTIVE"]}
          />
          <Field
            label="Follow-up Date"
            type="date"
            value={form.followUpDate}
            onChange={(v) => updateField("followUpDate", v)}
          />
        </div>

        <Field label="Address" required value={form.address} onChange={(v) => updateField("address", v)} />

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, required = false }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
