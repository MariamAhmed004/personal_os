import { Card, Form } from "react-bootstrap";

export function SettingsPage() {
  return (
    <>
      <div className="mb-4"><p className="muted-label mb-2">Make it yours</p><h1 className="page-title fw-bold">Settings</h1></div>
      <Card className="surface-card"><Card.Body className="p-4">
        <h2 className="h5">Appearance</h2>
        <Form.Check type="switch" id="dark-mode" label="Dark mode (default)" checked disabled />
        <p className="small text-secondary mt-2 mb-0">Theme preferences will become configurable in a future update.</p>
      </Card.Body></Card>
    </>
  );
}
