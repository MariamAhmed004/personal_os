import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button, Nav } from "react-bootstrap";
import { api } from "../shared/api";
import { Icon } from "../shared/Icon";
import { useTheme } from "./ThemeContext";
import { Walkthrough } from "./Walkthrough";
import { DemoNotice } from "./DemoNotice";
import { isDemoMode } from "../demo/config";

const pendingWalkthroughKey = "kanli-walkthrough-pending-user";

function walkthroughKey(userId: string, state: "started" | "finished") {
  return `kanli-walkthrough-${state}:${userId}`;
}

const links = [
  ["Home", "/", "home"],
  ["Daily Sheet", "/daily-sheet", "today"],
  ["Calendar", "/calendar", "calendar"],
  ["Habits", "/habits", "habits"],
  ["For Later", "/backlog", "backlog"],
  ["Journal", "/journal", "journal"],
  ["Settings", "/settings", "settings"],
] as const;

const walkthroughTargets: Record<string, string> = {
  "/daily-sheet": "daily-sheet",
  "/calendar": "calendar",
  "/habits": "habits",
  "/backlog": "for-later",
  "/journal": "journal",
};

export function Layout() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const walkthroughButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    api<{ id: string }>("/users/me").then((user) => {
      if (!active) return;
      setUserId(user.id);
      if (isDemoMode) return;
      if (localStorage.getItem(pendingWalkthroughKey) !== user.id) return;
      localStorage.removeItem(pendingWalkthroughKey);
      const startedKey = walkthroughKey(user.id, "started");
      const finishedKey = walkthroughKey(user.id, "finished");
      if (!localStorage.getItem(startedKey) && !localStorage.getItem(finishedKey)) {
        localStorage.setItem(startedKey, "true");
        setWalkthroughOpen(true);
      }
    }).catch(() => {
      if (active) setUserId(null);
    });
    return () => { active = false; };
  }, []);

  function startWalkthrough() {
    if (!userId) return;
    if (!isDemoMode) {
      localStorage.setItem(walkthroughKey(userId, "started"), "true");
      localStorage.removeItem(pendingWalkthroughKey);
    }
    setWalkthroughOpen(true);
  }

  const finishWalkthrough = useCallback(() => {
    if (userId && !isDemoMode) localStorage.setItem(walkthroughKey(userId, "finished"), "true");
    setWalkthroughOpen(false);
    walkthroughButtonRef.current?.focus();
  }, [userId]);

  const signOut = () => {
    if (isDemoMode) {
      window.location.assign(`${import.meta.env.BASE_URL}#/`);
      return;
    }
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
            <Nav.Link as={NavLink} to={to} end={to === "/"} key={to} data-tour={walkthroughTargets[to]}>
              <Icon name={icon} className="nav-icon" />{label}
            </Nav.Link>
          ))}
        </Nav>
        <div className="sidebar-bottom">A little more intention,<br />one day at a time.</div>
      </aside>
      <div className="app-main">
        {isDemoMode && <DemoNotice />}
        <header className="topbar">
          <span className="topbar-date">{today}</span>
          <Button
            variant="outline-secondary"
            size="sm"
            className="theme-toggle"
            ref={walkthroughButtonRef}
            onClick={startWalkthrough}
            disabled={!userId}
            aria-label="Start the Personal OS walkthrough"
            title="Start the Personal OS walkthrough"
          >
            <Icon name="help" className="button-icon" />
            <span>Help</span>
          </Button>
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
          <Button variant="light" size="sm" className="signout-button" onClick={signOut}>{isDemoMode ? "Reset demo" : "Sign out"}</Button>
        </header>
        <main className="app-content"><Outlet /></main>
      </div>
      <Walkthrough open={walkthroughOpen} onFinish={finishWalkthrough} />
    </div>
  );
}
