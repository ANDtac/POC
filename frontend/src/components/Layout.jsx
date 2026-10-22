import { Link, NavLink, Outlet } from "react-router";
import { useAuth } from "../auth.jsx";

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link to={user ? "/runs" : "/"} className="brand">
            <img src="/logo.svg" alt="" width="32" height="32" />
            <span>Oak Challenge</span>
          </Link>
          <nav aria-label="Main" className="site-nav">
            {user ? (
              <>
                <NavLink to="/runs" end>Runs</NavLink>
                <NavLink to="/runs/new">New run</NavLink>
                <NavLink to="/settings" title="Account settings">{user.username}</NavLink>
                <button type="button" className="link-button" onClick={logout}>Log out</button>
              </>
            ) : (
              <>
                <NavLink to="/login">Log in</NavLink>
                <NavLink to="/register" className="button button--small">Sign up</NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main" className="page">
        <Outlet />
      </main>
    </>
  );
}
