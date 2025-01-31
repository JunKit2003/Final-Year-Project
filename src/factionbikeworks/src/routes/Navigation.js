import { useNavigate } from "react-router-dom";

const useGlobalNavigation = () => {
  const navigate = useNavigate();

  // Navigation functions
  const goToCatalogPage = () => navigate("/catalog");
  const goToAdminPage = () => navigate("/admin");
  const goToAboutPage = () => navigate("/about");
  const goToLoginPage = () => navigate("/login");
  const goToSignupPage = () => navigate("/signup");
  const goToCartPage = () => navigate("/cart");
  const goToPasswordResetPage = () => navigate("/passwordReset");
  const goToViewProductPage = (productId) => navigate(`/viewProduct/${productId}`);
  const goToHomePage = () => navigate("/");
  const goToCheckoutPage = () => navigate("/checkoutPage");
  const goToViewOrderListPage = (orderId) => navigate(`admin/viewOrderList/${orderId}`)
  const goToOrderHistoryPage = () => navigate("/orderHistory");
  // Add `sessionId` to PaymentSuccessPage URL
  const goToPaymentSuccessPage = (sessionId) => {
    if (!sessionId) {
      console.error("Session ID is required to navigate to PaymentSuccessPage.");
      return;
    }
    navigate(`/paymentSuccessPage?session_id=${sessionId}`);
  };

  const goToPaymentFailedPage = () => navigate("/paymentFailedPage");

  return {
    goToAdminPage,
    goToAboutPage,
    goToHomePage,
    goToCatalogPage,
    goToLoginPage,
    goToSignupPage,
    goToViewProductPage,
    goToCartPage,
    goToPasswordResetPage,
    goToCheckoutPage,
    goToPaymentSuccessPage,
    goToPaymentFailedPage,
    goToViewOrderListPage,
    goToOrderHistoryPage,
  };
};

export default useGlobalNavigation;
