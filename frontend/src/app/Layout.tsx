import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button, Nav } from "react-bootstrap";
import { Icon } from "../shared/Icon";
import { useTheme } from "./ThemeContext";

const links = [
  ["Home", "/", "home"],
  ["Daily Sheet", "/daily-sheet", "today"],
  ["Calendar", "/calendar", "calendar"],
  ["Habits", "/habits", "habits"],
  ["Backlog", "/backlog", "backlog"],
  ["Journal", "/journal", "journal"],
  ["Settings", "/settings", "settings"],
] as const;

export function Layout() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const signOut = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };
  const today = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <NavLink to="/" className="brand-mark">
          <span className="brand-symbol"><Icon name="leaf" className="nav-icon" /></span>
          <span>Personal OS</span>
        </NavLink>
        <p className="sidebar-caption">Your space</p>
        <Nav className="app-nav flex-column">
          {links.map(([label, to, icon]) => (
            <Nav.Link as={NavLink} to={to} end={to === "/"} key={to}>
              <Icon name={icon} className="nav-icon" />{label}
            </Nav.Link>
          ))}
        </Nav>
        <div className="sidebar-bottom">A little more intention,<br />one day at a time.</div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <span className="topbar-date">{today}</span>
          <Button
            variant="outline-secondary"
            size="sm"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} className="button-icon" />
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </Button>
          <Button variant="light" size="sm" className="signout-button" onClick={signOut}>Sign out</Button>
        </header>
        <main className="app-content"><Outlet /></main>
      </div>
    </div>
  );
}
