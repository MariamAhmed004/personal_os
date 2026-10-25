import { Button, Card } from "react-bootstrap";
import { Icon } from "../../shared/Icon";
import { useTheme } from "../../app/ThemeContext";

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <div className="page-heading"><p className="eyebrow mb-2">Make it yours</p><h1 className="page-title"><Icon name="settings" className="heading-icon" />Settings</h1><p className="page-subtitle">A few quiet details about your personal space.</p></div>
      <Card className="surface-card accent-green"><Card.Body>
        <p className="eyebrow">Your space</p>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <h2 className="h5">Personal OS {theme === "dark" ? "Dark" : "Light"}</h2>
            <p className="text-secondary mb-0">Choose the look that feels right for your planning space.</p>
          </div>
          <Button variant="outline-primary" onClick={toggleTheme}>
            <Icon name={theme === "dark" ? "sun" : "moon"} className="button-icon" />
            Switch to {theme === "dark" ? "light" : "dark"} mode
          </Button>
        </div>
      </Card.Body></Card>
    </>
  );
}
