import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../../components/Spinner";
import ErrorState from "../../components/ErrorState";

const CAN_WRITE_ROLES = ["ADMIN", "SALES"];

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState("");

  function loadCustomer() {
    setLoading(true);
    setError("");
    return api
      .get(`/customers/${id}`)
      .then((res) => setCustomer(res.data.customer))
      .catch(() => setError("Failed to load customer."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddNote(event) {
    event.preventDefault();
    setAddingNote(true);
    setNoteError("");
    try {
      await api.post(`/customers/${id}/follow-ups`, { note });
      setNote("");
      await loadCustomer();
    } catch (err) {
      setNoteError(err.response?.data?.error ?? "Failed to add note.");
    } finally {
      setAddingNote(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={loadCustomer} />;
  if (!customer) return null;

  const canWrite = CAN_WRITE_ROLES.includes(user?.role);

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{customer.name}</h1>
        {canWrite && (
          <Link
            to={`/customers/${id}/edit`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Edit
          </Link>
        )}
      </div>

      <dl className="mb-6 grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-gray-200 bg-white p-6 sm:grid-cols-2">
        <Detail label="Business" value={customer.businessName} />
        <Detail label="Mobile" value={customer.mobile} />
        <Detail label="Email" value={customer.email || "—"} />
        <Detail label="GST Number" value={customer.gstNumber || "—"} />
        <Detail label="Type" value={customer.type} />
        <Detail label="Status" value={customer.status} />
        <Detail label="Address" value={customer.address} />
        <Detail
          label="Follow-up Date"
          value={customer.followUpDate ? customer.followUpDate.slice(0, 10) : "—"}
        />
        {customer.notes && <Detail label="Notes" value={customer.notes} full />}
      </dl>

      <h2 className="mb-2 text-lg font-semibold text-gray-900">Follow-up Notes</h2>

      {canWrite && (
        <form onSubmit={handleAddNote} className="mb-4 flex gap-2">
          <input
            type="text"
            required
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add a follow-up note..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={addingNote}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}
      {noteError && <p className="mb-4 text-sm text-red-600">{noteError}</p>}

      <ul className="space-y-2">
        {customer.followUps.map((followUp) => (
          <li key={followUp.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
            <p className="text-gray-900">{followUp.note}</p>
            <p className="mt-1 text-xs text-gray-500">
              {followUp.createdBy.name} · {new Date(followUp.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
        {customer.followUps.length === 0 && <p className="text-sm text-gray-500">No follow-up notes yet.</p>}
      </ul>
    </div>
  );
}

function Detail({ label, value, full = false }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}
