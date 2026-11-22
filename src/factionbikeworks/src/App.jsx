import { Suspense, lazy, useEffect } from "react";
import { Outlet, Route, RouterProvider, createBrowserRouter, createRoutesFromElements, useLocation } from "react-router";
import { adminRoutes } from "./admin/routes";
import { SessionProvider, ThemeModeProvider, ToastProvider } from "./lib/store";
import { SiteProvider, titleFor, useSite } from "./lib/site";
import { NotFoundBody } from "./components/sections/NotFound";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { ChatLauncher, Loader } from "./components/ui/Bits";

const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Catalog = lazy(() => import("./pages/Catalog"));
const ViewProduct = lazy(() => import("./pages/ViewProduct"));
const Cart = lazy(() => import("./pages/Cart"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFailed = lazy(() => import("./pages/PaymentFailed"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const PasswordReset = lazy(() => import("./pages/PasswordReset"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const CustomerViewOrderList = lazy(() => import("./pages/CustomerViewOrderList"));
const Chatbot = lazy(() => import("./pages/Chatbot"));


function RouteEffects() {
  const { pathname } = useLocation();
  const site = useSite();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    // Admin and product pages set their own titles.
    if (!pathname.startsWith("/admin") && !pathname.startsWith("/viewProduct")) document.title = titleFor(site, pathname);
  }, [pathname, site]);
  return null;
}

// Pages with their own sticky summary/CTA (or the chat itself) skip the floating chat button.
const NO_CHAT = ["/cart", "/checkoutPage", "/chatbot"];

function SiteLayout() {
  const { pathname } = useLocation();
  const { chatbot } = useSite();
  return (
    <div className="app">
      <Header />
      <main>
        <Suspense fallback={<Loader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      {chatbot.floating && !NO_CHAT.includes(pathname) && <ChatLauncher label={chatbot.launcherLabel} />}
    </div>
  );
}

function BareLayout() {
  // Auth pages: header only, full-bleed split screen.
  return (
    <div className="app app--bare">
      <Header />
      <main>
        <Suspense fallback={<Loader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

function NotFound() {
  return <NotFoundBody content={useSite()["content.notFound"]} />;
}

// Providers live inside the router: toasts can carry <Link> actions ("View cart"), and the
// data router lets the admin block navigation away from unsaved edits.
function Root() {
  return (
    <ThemeModeProvider>
      <ToastProvider>
        <SessionProvider>
          <SiteProvider>
            <RouteEffects />
            <Outlet />
          </SiteProvider>
        </SessionProvider>
      </ToastProvider>
    </ThemeModeProvider>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Root />}>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/catalog/:brandname?" element={<Catalog />} />
        <Route path="/viewProduct/:productId" element={<ViewProduct />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkoutPage" element={<CheckoutPage />} />
        <Route path="/paymentSuccess" element={<PaymentSuccess />} />
        <Route path="/paymentFailed" element={<PaymentFailed />} />
        <Route path="/orderHistory" element={<OrderHistory />} />
        <Route path="/customerViewOrderList/:uid/:orderId" element={<CustomerViewOrderList />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route element={<BareLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/PasswordReset" element={<PasswordReset />} />
      </Route>
      {adminRoutes()}
    </Route>
  )
);

export default function App() {
  return <RouterProvider router={router} />;
}
