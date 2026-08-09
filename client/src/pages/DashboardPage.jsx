import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Welcome, {user?.name}</h1>
      <p className="mt-1 text-sm text-gray-500">
        Logged in as {user?.role}. Customer, product, and challan pages land in Task 8.
      </p>
    </div>
  );
}
