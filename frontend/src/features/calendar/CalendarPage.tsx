import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Form, Modal, ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import { motion } from "framer-motion";
import { api } from "../../shared/api";
import type { CalendarEvent } from "../../shared/types";
import { Icon } from "../../shared/Icon";

const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateTimeLocal(value: Date) {
  return `${localDate(value)}T${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function toLocalDateTime(value: string) {
  return dateTimeLocal(new Date(value));
}

function CalendarActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: "plus" | "edit" | "trash";
  onClick: () => void;
}) {
  return (
    <Button type="button" size="sm" variant="outline-secondary" className="calendar-icon-action" aria-label={label} title={label} onClick={onClick}>
      <Icon name={icon} />
    </Button>
  );
}

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfWeek(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - result.getDay());
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
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(null);
  const [expandedEventsDate, setExpandedEventsDate] = useState<Date | null>(null);
  const [openActionsDate, setOpenActionsDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function refresh() {
    try { setEvents(await api<CalendarEvent[]>("/calendar/events")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load calendar."); }
  }
  useEffect(() => { void refresh(); }, []);

  const days = useMemo(() => {
    if (mode === "week") {
      const sunday = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(sunday);
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

  function openCreate(date: Date) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setSelectedDate(date);
    setEditingEvent(null);
    setTitle("");
    setEventType("custom");
    setStartsAt(dateTimeLocal(start));
    setEndsAt(dateTimeLocal(end));
    setError("");
    setSaved(false);
    setModalMode("create");
  }

  function openEdit(event: CalendarEvent) {
    setSelectedDate(new Date(event.starts_at));
    setEditingEvent(event);
    setTitle(event.title);
    setEventType(event.event_type);
    setStartsAt(toLocalDateTime(event.starts_at));
    setEndsAt(toLocalDateTime(event.ends_at));
    setError("");
    setSaved(false);
    setModalMode("edit");
  }

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    try {
      const body = {
        title,
        event_type: eventType,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
      };
      if (modalMode === "edit" && editingEvent) {
        await api(`/calendar/events/${editingEvent.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/calendar/events", { method: "POST", body: JSON.stringify(body) });
      }
      setSaved(true);
      setModalMode(null);
      setEditingEvent(null);
      setExpandedEventsDate(null);
      setOpenActionsDate(null);
      await refresh();
    } catch (cause) {
      const action = modalMode === "edit" ? "update" : "create";
      setError(cause instanceof Error ? cause.message : `Could not ${action} event.`);
    }
  }

  async function removeEvent() {
    if (!deletingEvent) return;
    try {
      await api(`/calendar/events/${deletingEvent.id}`, { method: "DELETE" });
      setDeletingEvent(null);
      setExpandedEventsDate(null);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete event."); }
  }

  function actionButtons(event: CalendarEvent) {
    return (
      <div className="calendar-event-actions">
        <CalendarActionButton label={`Edit ${event.title}`} icon="edit" onClick={() => openEdit(event)} />
        <CalendarActionButton label={`Delete ${event.title}`} icon="trash" onClick={() => setDeletingEvent(event)} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}>
      <div className="page-heading" data-tour="calendar"><p className="eyebrow mb-2">Make room for what matters</p><h1 className="page-title"><Icon name="calendar" className="heading-icon" />Your calendar</h1><p className="page-subtitle">See the shape of your time, and make space for what matters.</p></div>
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
          <div className="calendar-grid-scroll" tabIndex={0} aria-label="Calendar grid; scroll horizontally on smaller screens">
            <div className="calendar-grid" role="grid" aria-label={`${periodLabel} calendar`}>
              {weekdayNames.map((day) => <div className="calendar-weekday" role="columnheader" key={day}>{day}</div>)}
              {days.map((date) => {
                const dateKey = localDate(date);
                const dayEvents = events.filter((event) => localDate(new Date(event.starts_at)) === dateKey).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
                const outside = mode === "month" && date.getMonth() !== anchor.getMonth();
                const today = dateKey === localDate(new Date());
                const actionsOpen = openActionsDate === dateKey;
                return (
                  <div className={`calendar-day${outside ? " outside" : ""}${today ? " today" : ""}${actionsOpen ? " actions-open" : ""}`} role="gridcell" key={dateKey}>
                    <div className="calendar-day-heading">
                      <span className="calendar-date">{date.getDate()}</span>
                      {today && <span className="today-label">Today</span>}
                      <div className="calendar-day-actions">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline-secondary"
                          className="calendar-day-actions-toggle"
                          aria-label={`${actionsOpen ? "Hide" : "Show"} actions for ${date.toLocaleDateString()}`}
                          aria-expanded={actionsOpen}
                          onClick={() => setOpenActionsDate(actionsOpen ? null : dateKey)}
                        >
                          <Icon name="more" />
                        </Button>
                        <div className="calendar-day-actions-menu" aria-label={`Actions for ${date.toLocaleDateString()}`}>
                          <CalendarActionButton label={`Add event on ${date.toLocaleDateString()}`} icon="plus" onClick={() => openCreate(date)} />
                        </div>
                      </div>
                    </div>
                    {dayEvents.slice(0, 3).map((event) => (
                      <div className={`calendar-event ${eventStyle(event.event_type)}`} key={event.id} title={`${event.title} · ${new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}>
                        <span>{new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} {event.title}</span>
                        {actionButtons(event)}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <button type="button" className="calendar-more" onClick={() => setExpandedEventsDate(date)}>
                        +{dayEvents.length - 3} more
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card.Body>
      </Card>
      <Modal show={modalMode !== null} onHide={() => setModalMode(null)} centered>
        <Modal.Header closeButton><Modal.Title>{modalMode === "edit" ? "Edit event" : "Add event"}</Modal.Title></Modal.Header>
        <Form onSubmit={createEvent}>
          <Modal.Body>
            <p className="small text-secondary">
              {modalMode === "edit" ? "Update this calendar event." : `Add an event for ${selectedDate?.toLocaleDateString() ?? "your selected day"}.`}
            </p>
            <div className="row g-3">
              <Form.Group className="col-12"><Form.Label>What’s happening?</Form.Label><Form.Control required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A coffee with a friend" /></Form.Group>
              <Form.Group className="col-12"><Form.Label>Kind</Form.Label><Form.Select value={eventType} onChange={(event) => setEventType(event.target.value as CalendarEvent["event_type"])}><option value="custom">Something else</option><option value="interview">Interview</option><option value="workshop">Workshop</option><option value="appointment">Appointment</option><option value="graduation">Graduation</option></Form.Select></Form.Group>
              <Form.Group className="col-sm-6"><Form.Label>Starts</Form.Label><Form.Control required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></Form.Group>
              <Form.Group className="col-sm-6"><Form.Label>Ends</Form.Label><Form.Control required type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="outline-secondary" onClick={() => setModalMode(null)}>Cancel</Button>
            <Button type="submit">{modalMode === "edit" ? "Save changes" : "Add event"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
      <Modal show={Boolean(deletingEvent)} onHide={() => setDeletingEvent(null)} centered>
        <Modal.Header closeButton><Modal.Title>Delete event?</Modal.Title></Modal.Header>
        <Modal.Body>Remove “{deletingEvent?.title}” from your calendar? This cannot be undone.</Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setDeletingEvent(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => void removeEvent()}>Delete event</Button>
        </Modal.Footer>
      </Modal>
      <Modal show={Boolean(expandedEventsDate)} onHide={() => setExpandedEventsDate(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Events · {expandedEventsDate?.toLocaleDateString()}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {expandedEventsDate && events
            .filter((event) => localDate(new Date(event.starts_at)) === localDate(expandedEventsDate))
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
            .map((event) => (
              <div className="calendar-modal-event" key={event.id}>
                <div>
                  <p className="fw-semibold mb-1">{event.title}</p>
                  <p className="small text-secondary mb-0">{new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                </div>
                {actionButtons(event)}
              </div>
            ))}
        </Modal.Body>
      </Modal>
    </motion.div>
  );
}
