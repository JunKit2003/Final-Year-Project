import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Logo } from "../components/Header";
import { Loader } from "../components/ui/Bits";
import { ArrowUpRight, Logout, Moon, Sun } from "../components/ui/Icons";
import { useSession, useThemeMode } from "../lib/store";
import { ADMIN_NAV } from "./nav";
import "./admin.css";

export default function AdminLayout() {
  const { user, logout } = useSession();
  const { mode, toggle } = useThemeMode();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.title = "Admin · Faction Bikeworks";
  }, [pathname]);

  const isActive = (item) => (item.end ? pathname === item.to : pathname.startsWith(item.match || item.to));

  return (
    <div className={`adm ${open ? "is-nav-open" : ""}`}>
      <a href="#adm-main" className="sr-only adm-skip">
        Skip to content
      </a>
      <header className="adm-top">
        <button type="button" className={`burger adm-burger ${open ? "is-open" : ""}`} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span />
          <span />
        </button>
        <Link to="/admin" className="adm-logo" aria-label="Admin home">
          <Logo />
          <span className="mono">Admin</span>
        </Link>
        <div className="adm-top-actions">
          <Link to="/" className="btn btn-ghost btn-sm">
            View site <ArrowUpRight />
          </Link>
          <button type="button" className="icon-btn" onClick={toggle} aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}>
            {mode === "dark" ? <Sun /> : <Moon />}
          </button>
          <span className="mono dim adm-user">{user?.username}</span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Sign out"
            title="Sign out"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
          >
            <Logout />
          </button>
        </div>
      </header>
      <nav className="adm-nav" aria-label="Admin" onClick={(e) => e.target.closest("a") && setOpen(false)}>
        {ADMIN_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={() => `adm-nav-link ${isActive(item) ? "is-active" : ""}`} aria-current={isActive(item) ? "page" : undefined}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main id="adm-main" className="adm-main">
        <Suspense fallback={<Loader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
