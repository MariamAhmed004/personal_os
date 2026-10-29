import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Card, Form, Modal } from "react-bootstrap";
import { api } from "../../shared/api";
import type { BacklogItem, CalendarEvent } from "../../shared/types";
import { Icon } from "../../shared/Icon";

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function nextAvailableDay() {
  const date = new Date();
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = new Date();
    candidate.setDate(date.getDate() + offset);
    if (candidate.getDay() !== 0 && candidate.getDay() !== 6) return localDate(candidate);
  }
  return localDate(date);
}

export function BacklogPage() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scheduling, setScheduling] = useState<BacklogItem | null>(null);
  const [scheduleDate, setScheduleDate] = useState(nextAvailableDay);
  const [scheduleTime, setScheduleTime] = useState("09:00");

  async function refresh() {
    try { setItems(await api<BacklogItem[]>("/backlog/items")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load your list."); }
  }
  useEffect(() => { void refresh(); }, []);

  async function addItem(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/backlog/items", { method: "POST", body: JSON.stringify({ title, description: description || null }) });
      setTitle("");
      setDescription("");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add item."); }
  }

  async function toggle(item: BacklogItem) {
    try {
      await api(`/backlog/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ is_completed: !item.is_completed }) });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update item."); }
  }

  async function remove(id: string) {
    try {
      await api(`/backlog/items/${id}`, { method: "DELETE" });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete item."); }
  }

  function openSchedule(item: BacklogItem) {
    setScheduling(item);
    setScheduleDate(nextAvailableDay());
    setScheduleTime("09:00");
    setError("");
    setSuccess("");
  }

  async function scheduleItem(event: FormEvent) {
    event.preventDefault();
    if (!scheduling) return;
    setError("");
    const start = new Date(`${scheduleDate}T${scheduleTime}`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    try {
      const events = await api<CalendarEvent[]>("/calendar/events");
      const conflict = events.find((existing) => start < new Date(existing.ends_at) && end > new Date(existing.starts_at));
      if (conflict) {
        setError(`That time overlaps “${conflict.title}”. Choose another time to keep your day comfortable.`);
        return;
      }
      await api("/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: scheduling.title,
          description: scheduling.description,
          event_type: "custom",
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
        }),
      });
      setSuccess(`“${scheduling.title}” is on your calendar.`);
      setScheduling(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not schedule this item.");
    }
  }

  return (
    <>
      <div className="page-heading" data-tour="for-later"><p className="eyebrow mb-2">Ideas for another day</p><h1 className="page-title"><Icon name="backlog" className="heading-icon" />Things for later</h1><p className="page-subtitle">A soft landing place for things you’d like to do, when the time feels right.</p></div>
      {error && !scheduling && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <Card className="surface-card accent-amber mb-4">
        <Card.Body>
          <p className="eyebrow mb-3">Save an intention for later</p>
          <Form onSubmit={addItem} className="row g-3 align-items-end">
            <Form.Group className="col-md-5"><Form.Label>What’s on your mind?</Form.Label><Form.Control required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Update my portfolio" /></Form.Group>
            <Form.Group className="col-md-5"><Form.Label>A little context (optional)</Form.Label><Form.Control value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add context or a reminder" /></Form.Group>
            <div className="col-md-2"><Button type="submit" className="w-100">Save for later</Button></div>
          </Form>
        </Card.Body>
      </Card>
      {items.length === 0 ? <Card className="surface-card"><Card.Body className="p-4 text-secondary">Your list is clear for now. Enjoy the breathing room.</Card.Body></Card> : (
        <div className="planner-grid">
          {items.map((item) => (
            <div className="planner-span-6" key={item.id}>
              <Card className={`surface-card${item.is_completed ? "" : " accent-amber"}`}>
                <Card.Body className="d-flex align-items-start gap-3">
                  <Form.Check type="checkbox" checked={item.is_completed} onChange={() => void toggle(item)} aria-label={`Mark ${item.title} ${item.is_completed ? "incomplete" : "complete"}`} />
                  <div className="flex-grow-1">
                    <h2 className={`h5 mb-1${item.is_completed ? " text-decoration-line-through text-secondary" : ""}`}>{item.title}</h2>
                    {item.description && <p className="text-secondary small mb-3">{item.description}</p>}
                    {!item.is_completed && <Button size="sm" variant="outline-primary" onClick={() => openSchedule(item)}>Schedule this week</Button>}
                  </div>
                  <Button variant="outline-danger" size="sm" aria-label={`Remove ${item.title}`} onClick={() => void remove(item.id)}>Remove</Button>
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      )}
      <Modal show={Boolean(scheduling)} onHide={() => setScheduling(null)} centered>
        <Modal.Header closeButton><Modal.Title>Make space for it</Modal.Title></Modal.Header>
        <Form onSubmit={scheduleItem}>
          <Modal.Body>
            <p className="text-secondary">Choose a time for <strong>{scheduling?.title}</strong>. We’ll add it to your calendar as a one-hour event.</p>
            {error && <Alert variant="danger">{error}</Alert>}
            <div className="row g-3">
              <Form.Group className="col-sm-7"><Form.Label>Day</Form.Label><Form.Control required type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} /></Form.Group>
              <Form.Group className="col-sm-5"><Form.Label>Start time</Form.Label><Form.Control required type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} /></Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer><Button variant="outline-secondary" onClick={() => setScheduling(null)}>Not now</Button><Button type="submit">Add to calendar</Button></Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
