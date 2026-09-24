import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// allowedRoles is optional so a route can be role-gated
// (e.g. <ProtectedRoute allowedRoles={["ADMIN", "OPERATIONS"]}>) without
// needing new infrastructure.
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
