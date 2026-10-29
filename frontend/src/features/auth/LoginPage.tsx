import { FormEvent, useState } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../shared/api";
import { isDemoMode } from "../../demo/config";

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface RegisteredUser {
  id: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isDemoMode) {
    return (
      <div className="auth-panel">
        <div className="mb-4">
          <p className="muted-label mb-2">A calmer way to plan</p>
          <h1 className="page-title fw-bold">Personal OS</h1>
          <p className="text-secondary">Explore the Personal OS demo without creating an account or signing in.</p>
        </div>
        <Card className="surface-card">
          <Card.Body className="p-4">
            <h2 className="h5 mb-3">Welcome to the demo</h2>
            <p className="text-secondary">Your changes are temporary and will reset when you refresh.</p>
            <Button className="w-100" onClick={() => navigate("/", { replace: true })}>
              Explore demo without signing in
            </Button>
          </Card.Body>
        </Card>
      </div>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (registering) {
        const registeredUser = await api<RegisteredUser>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password, display_name: displayName }),
        });
        localStorage.setItem("kanli-walkthrough-pending-user", registeredUser.id);
      }
      const token = await api<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("access_token", token.access_token);
      navigate("/", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-panel">
      <div className="mb-4">
        <p className="muted-label mb-2">A calmer way to plan</p>
        <h1 className="page-title fw-bold">Personal OS</h1>
        <p className="text-secondary">Your plans, habits, and reflections in one place.</p>
      </div>
      <Card className="surface-card">
        <Card.Body className="p-4">
          <h2 className="h5 mb-4">{registering ? "Create your account" : "Welcome back"}</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={submit}>
            {registering && (
              <Form.Group className="mb-3">
                <Form.Label>Display name</Form.Label>
                <Form.Control required maxLength={100} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Password</Form.Label>
              <Form.Control required minLength={registering ? 8 : undefined} type="password" autoComplete={registering ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Form.Group>
            <Button type="submit" className="w-100" disabled={busy}>{busy ? "Please wait…" : registering ? "Create account" : "Sign in"}</Button>
          </Form>
          <p className="text-secondary small mt-3 mb-0">
            {registering ? "Already have an account? " : "New here? "}
            <Link to="/login" onClick={(e) => { e.preventDefault(); setRegistering(!registering); setError(""); }}>
              {registering ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </Card.Body>
      </Card>
    </div>
  );
}
