// Admin route tree, plugged into the app's data router (needed for unsaved-change guards).
import { lazy } from "react";
import { Route } from "react-router";
import RequireAdmin from "./RequireAdmin";
import Placeholder from "./pages/Placeholder";

const AdminLayout = lazy(() => import("./AdminLayout"));

const P = (title) => <Placeholder title={title} />;

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
      <Route index element={P("Dashboard")} />
      <Route path="orders" element={P("Orders")} />
      <Route path="orders/:id" element={P("Order")} />
      <Route path="products" element={P("Products")} />
      <Route path="products/new" element={P("New product")} />
      <Route path="products/:id" element={P("Product")} />
      <Route path="stock" element={P("Stock")} />
      <Route path="taxonomy" element={P("Categories & brands")} />
      <Route path="banners" element={P("Banners")} />
      <Route path="brands" element={P("Brands")} />
      <Route path="content/:page" element={P("Site content")} />
      <Route path="settings/:group" element={P("Shop settings")} />
      <Route path="customers" element={P("Customers")} />
      <Route path="customers/:id" element={P("Customer")} />
      <Route path="activity" element={P("Activity")} />
      <Route path="*" element={P("Not found")} />
    </Route>
  );
}
