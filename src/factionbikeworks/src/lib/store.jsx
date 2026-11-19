import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "./api";

/* -------------------------------------------------------------------------- */
/* Session: who is signed in, plus their cart. One /authenticate call per load. */
/* -------------------------------------------------------------------------- */

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [cart, setCart] = useState([]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.post("/api/account/authenticate", {});
      setUser(res.data?.user || null);
      return res.data?.user || null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  const refreshCart = useCallback(async (u = user) => {
    if (!u?.id) {
      setCart([]);
      return [];
    }
    try {
      const res = await api.get(`/api/cart/${u.id}`);
      const items = Array.isArray(res.data) ? res.data : [];
      setCart(items);
      return items;
    } catch {
      return [];
    }
  }, [user]);

  // Initial session check. State is set in the promise callbacks, not synchronously.
  useEffect(() => {
    let live = true;
    api
      .post("/api/account/authenticate", {})
      .then((res) => live && setUser(res.data?.user || null))
      .catch(() => live && setUser(null))
      .finally(() => live && setChecking(false));
    return () => {
      live = false;
    };
  }, []);

  // Load the cart whenever a different user signs in.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return undefined;
    let live = true;
    api
      .get(`/api/cart/${userId}`)
      .then((res) => live && setCart(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userId]);

  const login = async (emailOrUsername, password) => {
    const res = await api.post("/api/account/login", { emailOrUsername, password });
    setUser(res.data?.user || null);
    return res.data?.user;
  };

  const logout = async () => {
    try {
      await api.post("/api/account/logout", {});
    } finally {
      setUser(null);
      setCart([]);
    }
  };

  const addToCart = async (variationId, quantity = 1) => {
    if (!user?.id) throw new Error("not-signed-in");
    await api.post("/api/cart/add", { user_id: user.id, variation_id: variationId, quantity });
    return refreshCart(user);
  };

  const removeFromCart = async (cartItemId) => {
    await api.delete(`/api/cart/${cartItemId}`);
    setCart((items) => items.filter((i) => i.id !== cartItemId));
  };

  // Signed out means an empty cart, whatever was loaded before.
  const visibleCart = user ? cart : [];

  const value = {
    user,
    checking,
    isAdmin: user?.category === "Admin",
    cart: visibleCart,
    cartCount: visibleCart.reduce((n, i) => n + (Number(i.quantity) || 0), 0),
    refreshUser,
    refreshCart,
    login,
    logout,
    addToCart,
    removeFromCart,
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

/* -------------------------------------------------------------------------- */
/* Catalog: products fetched once, shared by home, catalog, product and orders. */
/* -------------------------------------------------------------------------- */

let productCache = null;
let productInflight = null;

const loadProducts = () => {
  if (productInflight) return productInflight;
  productInflight = api
    .post("/api/product/get", {})
    .then((res) => {
      productCache = res.data?.products || [];
      return productCache;
    })
    .finally(() => {
      productInflight = null;
    });
  return productInflight;
};

export function useProducts() {
  const [products, setProducts] = useState(productCache || []);
  const [loading, setLoading] = useState(!productCache);
  const [error, setError] = useState(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    loadProducts()
      .then((list) => {
        if (!live) return;
        setProducts(list);
        setError(null);
      })
      .catch(() => live && !productCache && setError("We couldn't load the shop right now."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [attempt]);

  // Retry is user-triggered (a button), so setting state here is fine.
  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  return { products, loading, error, retry };
}

/* -------------------------------------------------------------------------- */
/* Theme: dark by default (it's a bike shop, not a bank), remembers the choice. */
/* -------------------------------------------------------------------------- */

const ThemeModeContext = createContext({ mode: "dark", toggle: () => {} });

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mode === "dark" ? "#0b0c0a" : "#f1f0ea");
    localStorage.setItem("theme", mode);
  }, [mode]);

  const value = useMemo(() => ({ mode, toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")) }), [mode]);
  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export const useThemeMode = () => useContext(ThemeModeContext);

/* -------------------------------------------------------------------------- */
/* Toasts                                                                      */
/* -------------------------------------------------------------------------- */

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const id = useRef(0);

  const push = useCallback((message, tone = "ok", action = null) => {
    const key = ++id.current;
    setToasts((t) => [...t, { key, message, tone, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.key !== key)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.key} className={`toast toast--${t.tone}`}>
            <span className="toast-dot" />
            <span>{t.message}</span>
            {t.action}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
