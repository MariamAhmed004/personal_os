import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Form, ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import { motion } from "framer-motion";
import { api } from "../../shared/api";
import type { CalendarEvent } from "../../shared/types";
import { Icon } from "../../shared/Icon";

const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfWeek(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function eventStyle(type: CalendarEvent["event_type"]) {
  if (type === "workshop") return "event-teal";
  if (type === "appointment" || type === "interview") return "event-purple";
  if (type === "graduation") return "event-amber";
  return "";
}

export function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [mode, setMode] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(new Date());
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [eventType, setEventType] = useState<CalendarEvent["event_type"]>("custom");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function refresh() {
    try { setEvents(await api<CalendarEvent[]>("/calendar/events")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load calendar."); }
  }
  useEffect(() => { void refresh(); }, []);

  const days = useMemo(() => {
    if (mode === "week") {
      const monday = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(monday);
        date.setDate(date.getDate() + index);
        return date;
      });
    }
    const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const firstCell = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstCell);
      date.setDate(date.getDate() + index);
      return date;
    });
  }, [anchor, mode]);

  const periodLabel = mode === "week"
    ? `Week of ${new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(startOfWeek(anchor))}`
    : new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(anchor);

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
    setSaved(false);
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
      setSaved(true);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create event."); }
  }

  async function removeEvent(id: string) {
    try {
      await api(`/calendar/events/${id}`, { method: "DELETE" });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete event."); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}>
      <div className="page-heading"><p className="eyebrow mb-2">Make room for what matters</p><h1 className="page-title"><Icon name="calendar" className="heading-icon" />Your calendar</h1><p className="page-subtitle">See the shape of your time, and make space for what matters.</p></div>
      {error && <Alert variant="danger">{error}</Alert>}
      {saved && <Alert variant="success">Your event is on the calendar.</Alert>}
      <Card className="surface-card accent-teal mb-4">
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
            <div className="d-flex align-items-center gap-2">
              <Button variant="light" aria-label="Previous period" onClick={() => movePeriod(-1)}>←</Button>
              <Button variant="outline-secondary" onClick={() => setAnchor(new Date())}>Today</Button>
              <Button variant="light" aria-label="Next period" onClick={() => movePeriod(1)}>→</Button>
              <strong className="ms-2">{periodLabel}</strong>
            </div>
            <ToggleButtonGroup type="radio" name="calendar-mode" value={mode} onChange={(value: "week" | "month") => setMode(value)}>
              <ToggleButton id="calendar-week" value="week" variant="outline-primary">Week</ToggleButton>
              <ToggleButton id="calendar-month" value="month" variant="outline-primary">Month</ToggleButton>
            </ToggleButtonGroup>
          </div>
          <div className="calendar-grid" role="grid" aria-label={`${periodLabel} calendar`}>
            {weekdayNames.map((day) => <div className="calendar-weekday" role="columnheader" key={day}>{day}</div>)}
            {days.map((date) => {
              const dateKey = localDate(date);
              const dayEvents = events.filter((event) => localDate(new Date(event.starts_at)) === dateKey).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
              const outside = mode === "month" && date.getMonth() !== anchor.getMonth();
              const today = dateKey === localDate(new Date());
              return (
                <div className={`calendar-day${outside ? " outside" : ""}${today ? " today" : ""}`} role="gridcell" key={dateKey}>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="calendar-date">{mode === "week" ? date.getDate() : date.getDate()}</span>
                    {today && <span className="today-label">Today</span>}
                  </div>
                  {dayEvents.slice(0, 3).map((event) => (
                    <div className={`calendar-event ${eventStyle(event.event_type)}`} key={event.id} title={`${event.title} · ${new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}>
                      <span>{new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} {event.title}</span>
                      <button type="button" aria-label={`Remove ${event.title}`} onClick={() => void removeEvent(event.id)}>×</button>
                    </div>
                  ))}
                  {dayEvents.length > 3 && <span className="calendar-more">+{dayEvents.length - 3} more</span>}
                </div>
              );
            })}
          </div>
        </Card.Body>
      </Card>
      <Card className="surface-card">
        <Card.Body>
          <p className="eyebrow mb-3">Add something to look forward to</p>
          <Form onSubmit={createEvent} className="row g-3 align-items-end">
            <Form.Group className="col-lg-4"><Form.Label>What’s happening?</Form.Label><Form.Control required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A coffee with a friend" /></Form.Group>
            <Form.Group className="col-lg-2"><Form.Label>Kind</Form.Label><Form.Select value={eventType} onChange={(e) => setEventType(e.target.value as CalendarEvent["event_type"])}><option value="custom">Something else</option><option value="interview">Interview</option><option value="workshop">Workshop</option><option value="appointment">Appointment</option><option value="graduation">Graduation</option></Form.Select></Form.Group>
            <Form.Group className="col-lg-2"><Form.Label>Starts</Form.Label><Form.Control required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></Form.Group>
            <Form.Group className="col-lg-2"><Form.Label>Ends</Form.Label><Form.Control required type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></Form.Group>
            <div className="col-lg-2"><Button type="submit" className="w-100">Add event</Button></div>
          </Form>
        </Card.Body>
      </Card>
    </motion.div>
  );
}
