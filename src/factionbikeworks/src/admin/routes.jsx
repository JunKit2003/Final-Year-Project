// Admin route tree, plugged into the app's data router (needed for unsaved-change guards).
import { lazy } from "react";
import { Navigate, Route } from "react-router";
import RequireAdmin from "./RequireAdmin";
import { Link } from "react-router";
import { EmptyState } from "./ui/layout";

const AdminLayout = lazy(() => import("./AdminLayout"));
const ProductsList = lazy(() => import("./pages/products/ProductsList"));
const ProductEditor = lazy(() => import("./pages/products/ProductEditor"));
const StockLog = lazy(() => import("./pages/stock/StockLog"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const ContentPage = lazy(() => import("./pages/content/ContentPage"));
const BannersPage = lazy(() => import("./pages/BannersPage"));
const TaxonomyPage = lazy(() => import("./pages/TaxonomyPage"));
const CustomersList = lazy(() => import("./pages/customers/CustomersList"));
const CustomerDetail = lazy(() => import("./pages/customers/CustomerDetail"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ActivityPage = lazy(() => import("./pages/ActivityPage"));
const OrdersList = lazy(() => import("./pages/orders/OrdersList"));
const OrderDetail = lazy(() => import("./pages/orders/OrderDetail"));

const AdminNotFound = () => (
  <EmptyState
    title="That admin page doesn't exist"
    action={
      <Link to="/admin" className="btn btn-primary adm-btn">
        Go to the dashboard
      </Link>
    }
  />
);

export function adminRoutes() {
  return (
    <Route
      path="/admin"
      element={
        <RequireAdmin>
          <AdminLayout />
        </RequireAdmin>
      }
    >
      <Route index element={<Dashboard />} />
      <Route path="orders" element={<OrdersList />} />
      <Route path="orders/:id" element={<OrderDetail />} />
      <Route path="products" element={<ProductsList />} />
      <Route path="products/new" element={<ProductEditor />} />
      <Route path="products/:id" element={<ProductEditor />} />
      <Route path="stock" element={<StockLog />} />
      <Route path="taxonomy" element={<TaxonomyPage />} />
      <Route path="banners" element={<BannersPage />} />
      <Route path="brands" element={<Navigate to="/admin/taxonomy" replace />} />
      <Route path="content/:page" element={<ContentPage />} />
      <Route path="settings/:group" element={<SettingsPage />} />
      <Route path="customers" element={<CustomersList />} />
      <Route path="customers/:id" element={<CustomerDetail />} />
      <Route path="activity" element={<ActivityPage />} />
      <Route path="*" element={<AdminNotFound />} />
    </Route>
  );
}
