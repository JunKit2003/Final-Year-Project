import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import logo from "../assets/faction-logo-ink.png";
import { useSession, useThemeMode, useToast } from "../lib/store";
import { useSite } from "../lib/site";
import { Bag, ChevronDown, Dashboard, Logout, Moon, Receipt, Search, Sun, User } from "./ui/Icons";


export function Logo({ className = "" }) {
  return <img src={logo} alt="Faction Bikeworks" className={`logo ${className}`} width="830" height="276" />;
}

export default function Header() {
  const site = useSite();
  const LINKS = site["content.header"].links;
  const { user, isAdmin, cartCount, logout } = useSession();
  const { mode, toggle } = useThemeMode();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [bump, setBump] = useState(false);
  const menuRef = useRef(null);
  const lastCount = useRef(cartCount);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 16);
      if (Math.abs(y - last) > 6) {
        setHidden(y > 260 && y > last);
        last = y;
      }
      document.documentElement.style.setProperty("--progress", String(y / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on navigation: adjust state during render rather than in an effect.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
    setMenu(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (e) => !menuRef.current?.contains(e.target) && setMenu(false);
    const onKey = (e) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  // Little bounce on the bag whenever something is added.
  useEffect(() => {
    if (cartCount > lastCount.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 700);
      lastCount.current = cartCount;
      return () => clearTimeout(t);
    }
    lastCount.current = cartCount;
    return undefined;
  }, [cartCount]);

  const signOut = async () => {
    await logout();
    toast("Signed out. Ride safe.");
    navigate("/");
  };

  return (
    <>
      <div className="progress" aria-hidden />
      <header className={`nav ${scrolled ? "is-scrolled" : ""} ${pathname === "/" && !scrolled && !open ? "nav--on-dark" : ""} ${hidden && !open && !menu ? "is-hidden" : ""}`}>
        <div className="wrap nav-inner">
          <Link to="/" className="nav-logo" aria-label={`${site.shop.name} home`}>
            <Logo />
          </Link>

          <nav className="nav-links" aria-label="Primary">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav-actions">
            <Link to="/catalog" className="icon-btn nav-search" aria-label="Search the shop">
              <Search />
            </Link>
            <button type="button" className="icon-btn theme-toggle" onClick={toggle} aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}>
              <span className={mode === "dark" ? "is-on" : ""}>
                <Moon />
              </span>
              <span className={mode === "light" ? "is-on" : ""}>
                <Sun />
              </span>
            </button>
            <Link to="/cart" className={`icon-btn bag ${bump ? "is-bump" : ""}`} aria-label={`Cart, ${cartCount} items`}>
              <Bag />
              {cartCount > 0 && <span className="bag-count">{cartCount > 99 ? "99+" : cartCount}</span>}
            </Link>

            {user ? (
              <div className="account" ref={menuRef}>
                <button type="button" className="account-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu">
                  <span className="avatar">{(user.first_name || user.username || "?").slice(0, 1).toUpperCase()}</span>
                  <span className="account-name">{user.username}</span>
                  <ChevronDown />
                </button>
                <div className={`account-menu ${menu ? "is-open" : ""}`} role="menu">
                  <p className="account-hi">
                    <span className="mono dim">Signed in as</span>
                    <strong>{user.email || user.username}</strong>
                  </p>
                  <Link to="/orderHistory" role="menuitem">
                    <Receipt /> My orders
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" role="menuitem">
                      <Dashboard /> Admin dashboard
                    </Link>
                  )}
                  <button type="button" role="menuitem" onClick={signOut}>
                    <Logout /> Sign out
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm nav-signin" state={{ from: pathname }}>
                <User /> Sign in
              </Link>
            )}

            <button type="button" className={`burger ${open ? "is-open" : ""}`} onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div className={`drawer-nav topo ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <nav className="wrap">
          {[{ to: "/", label: "Home" }, ...LINKS, { to: "/cart", label: `Cart${cartCount ? ` (${cartCount})` : ""}` }, ...(user ? [{ to: "/orderHistory", label: "My orders" }] : []), ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : [])].map((l, i) => (
            <Link key={l.to} to={l.to} className="drawer-link" style={{ transitionDelay: open ? `${60 + i * 45}ms` : "0ms" }} tabIndex={open ? 0 : -1}>
              <span className="mono">{String(i + 1).padStart(2, "0")}</span>
              {l.label}
            </Link>
          ))}
          <div className="drawer-foot" style={{ transitionDelay: open ? "420ms" : "0ms" }}>
            {user ? (
              <button type="button" className="btn btn-ghost" onClick={signOut} tabIndex={open ? 0 : -1}>
                <Logout /> Sign out {user.username}
              </button>
            ) : (
              <Link to="/login" className="btn btn-primary" tabIndex={open ? 0 : -1}>
                Sign in
              </Link>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
