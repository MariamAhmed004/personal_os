import { useEffect, useState } from "react";
import { Alert, Card, Col, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../../shared/api";
import type { CalendarEvent, DailySheet } from "../../shared/types";

function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [sheet, setSheet] = useState<DailySheet | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<CalendarEvent[]>("/calendar/events"),
      api<DailySheet>(`/daily-sheets/by-date/${todayDate()}`).catch(() => null),
    ]).then(([calendarEvents, dailySheet]) => {
      setEvents(calendarEvents.filter((event) => event.starts_at.slice(0, 10) >= todayDate()).slice(0, 4));
      setSheet(dailySheet);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load dashboard."));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-4">
        <p className="muted-label mb-2">{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p>
        <h1 className="page-title fw-bold">Your day, at a glance.</h1>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      <Row className="g-3">
        <Col lg={8}>
          <Card className="surface-card">
            <Card.Body className="p-4">
              <p className="muted-label">Today's focus</p>
              <h2 className="h4">{sheet?.highlights?.[0] ?? "Choose one meaningful thing to move forward."}</h2>
              <p className="text-secondary">{sheet?.notes || "Your Daily Sheet is your space to plan with intention."}</p>
              <Link className="btn btn-primary" to="/daily-sheet">Open Daily Sheet</Link>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="surface-card">
            <Card.Body className="p-4">
              <p className="muted-label">Current streak</p>
              <div className="display-5 fw-semibold">—</div>
              <p className="text-secondary mb-0">Habit tracking insights will appear here.</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="surface-card">
            <Card.Body className="p-4">
              <p className="muted-label">A moment to reflect</p>
              <p className="mb-0 text-secondary">Your personalized reflection will appear here as your journal grows.</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="surface-card">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <p className="muted-label mb-0">Upcoming events</p><Link to="/calendar">Calendar</Link>
              </div>
              {events.length ? events.map((event) => (
                <div className="d-flex justify-content-between gap-3 border-bottom border-secondary-subtle py-2" key={event.id}>
                  <span>{event.title}</span>
                  <span className="text-secondary text-nowrap">{new Date(event.starts_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                </div>
              )) : <p className="text-secondary mb-0">Nothing scheduled yet. Keep some room to breathe.</p>}
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="surface-card">
            <Card.Body className="p-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div><p className="muted-label">AI companion</p><p className="text-secondary mb-0">A future space for thoughtful suggestions. No AI is connected yet.</p></div>
              <span className="badge text-bg-secondary">Coming later</span>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </motion.div>
  );
}
