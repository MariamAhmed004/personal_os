import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Form, ListGroup, ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import { api } from "../../shared/api";
import type { CalendarEvent } from "../../shared/types";

export function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [mode, setMode] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(new Date());
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [eventType, setEventType] = useState<CalendarEvent["event_type"]>("custom");
  const [error, setError] = useState("");

  async function refresh() {
    try { setEvents(await api<CalendarEvent[]>("/calendar/events")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load calendar."); }
  }
  useEffect(() => { void refresh(); }, []);

  const visibleEvents = useMemo(() => {
    const start = new Date(anchor);
    if (mode === "week") {
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }
    const end = new Date(start);
    if (mode === "week") end.setDate(end.getDate() + 7);
    else { end.setMonth(end.getMonth() + 1); }
    return events.filter((event) => {
      const eventDate = new Date(event.starts_at);
      return eventDate >= start && eventDate < end;
    }).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [anchor, events, mode]);

  function movePeriod(amount: number) {
    setAnchor((current) => {
      const next = new Date(current);
      if (mode === "week") next.setDate(next.getDate() + amount * 7);
      else next.setMonth(next.getMonth() + amount);
      return next;
    });
  }

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title,
          event_type: eventType,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
        }),
      });
      setTitle("");
      setStartsAt("");
      setEndsAt("");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create event."); }
  }

  async function removeEvent(id: string) {
    try {
      await api(`/calendar/events/${id}`, { method: "DELETE" });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete event."); }
  }

  const periodLabel = mode === "week"
    ? `Week of ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - ((anchor.getDay() + 6) % 7)))}`
    : new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(anchor);

  return (
    <>
      <div className="mb-4"><p className="muted-label mb-2">Make room for what matters</p><h1 className="page-title fw-bold">Calendar</h1></div>
      {error && <Alert variant="danger">{error}</Alert>}
      <Card className="surface-card mb-3"><Card.Body className="p-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
          <div className="d-flex align-items-center gap-2">
            <Button variant="outline-secondary" onClick={() => movePeriod(-1)} aria-label="Previous period">←</Button>
            <Button variant="outline-secondary" onClick={() => setAnchor(new Date())}>Today</Button>
            <Button variant="outline-secondary" onClick={() => movePeriod(1)} aria-label="Next period">→</Button>
            <strong className="ms-2">{periodLabel}</strong>
          </div>
          <ToggleButtonGroup type="radio" name="calendar-mode" value={mode} onChange={(value: "week" | "month") => setMode(value)}>
            <ToggleButton id="calendar-week" value="week" variant="outline-primary">Week</ToggleButton>
            <ToggleButton id="calendar-month" value="month" variant="outline-primary">Month</ToggleButton>
          </ToggleButtonGroup>
        </div>
        {visibleEvents.length ? (
          <ListGroup variant="flush">{visibleEvents.map((event) => (
            <ListGroup.Item key={event.id} className="bg-transparent d-flex align-items-center justify-content-between gap-3 px-0">
              <div><div className="fw-semibold">{event.title}</div><div className="small text-secondary">{new Date(event.starts_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {event.event_type}</div></div>
              <Button size="sm" variant="outline-secondary" onClick={() => void removeEvent(event.id)}>Delete</Button>
            </ListGroup.Item>
          ))}</ListGroup>
        ) : <p className="text-secondary mb-0">No events in this period.</p>}
      </Card.Body></Card>
      <Card className="surface-card"><Card.Body className="p-4">
        <h2 className="h5 mb-3">Add an event</h2>
        <Form onSubmit={createEvent} className="row g-3 align-items-end">
          <Form.Group className="col-lg-4"><Form.Label>Title</Form.Label><Form.Control required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></Form.Group>
          <Form.Group className="col-lg-2"><Form.Label>Type</Form.Label><Form.Select value={eventType} onChange={(e) => setEventType(e.target.value as CalendarEvent["event_type"])}><option value="custom">Custom</option><option value="interview">Interview</option><option value="workshop">Workshop</option><option value="appointment">Appointment</option><option value="graduation">Graduation</option></Form.Select></Form.Group>
          <Form.Group className="col-lg-2"><Form.Label>Starts</Form.Label><Form.Control required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></Form.Group>
          <Form.Group className="col-lg-2"><Form.Label>Ends</Form.Label><Form.Control required type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></Form.Group>
          <div className="col-lg-2"><Button type="submit" className="w-100">Add event</Button></div>
        </Form>
      </Card.Body></Card>
    </>
  );
}
