import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersListPage from "./pages/customers/CustomersListPage";
import CustomerFormPage from "./pages/customers/CustomerFormPage";
import CustomerDetailPage from "./pages/customers/CustomerDetailPage";
import ProductFormPage from "./pages/products/ProductFormPage";
import ProductDetailPage from "./pages/products/ProductDetailPage";
import InventoryListPage from "./pages/InventoryListPage";
import WorkOrdersListPage from "./pages/workorders/WorkOrdersListPage";
import WorkOrderCreatePage from "./pages/workorders/WorkOrderCreatePage";
import WorkOrderDetailPage from "./pages/workorders/WorkOrderDetailPage";
import TransfersListPage from "./pages/transfers/TransfersListPage";
import TransferCreatePage from "./pages/transfers/TransferCreatePage";
import TransferDetailPage from "./pages/transfers/TransferDetailPage";
import OrdersListPage from "./pages/orders/OrdersListPage";
import OrderCreatePage from "./pages/orders/OrderCreatePage";
import OrderDetailPage from "./pages/orders/OrderDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      {/* reducedMotion="user" makes every Framer Motion animation in the
          app respect prefers-reduced-motion automatically, on top of the
          CSS-level override in index.css for plain CSS transitions. */}
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />

                <Route path="/customers" element={<CustomersListPage />} />
                <Route path="/customers/new" element={<CustomerFormPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/customers/:id/edit" element={<CustomerFormPage />} />

                <Route path="/inventory" element={<InventoryListPage />} />
                <Route path="/products/new" element={<ProductFormPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/products/:id/edit" element={<ProductFormPage />} />

                <Route path="/work-orders" element={<WorkOrdersListPage />} />
                <Route path="/work-orders/new" element={<WorkOrderCreatePage />} />
                <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />

                <Route path="/transfers" element={<TransfersListPage />} />
                <Route path="/transfers/new" element={<TransferCreatePage />} />
                <Route path="/transfers/:id" element={<TransferDetailPage />} />

                <Route path="/orders" element={<OrdersListPage />} />
                <Route path="/orders/new" element={<OrderCreatePage />} />
                <Route path="/orders/:id" element={<OrderDetailPage />} />
              </Route>
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MotionConfig>
    </BrowserRouter>
  );
}
