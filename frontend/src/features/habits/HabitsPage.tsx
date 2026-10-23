import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Card, Form, ListGroup } from "react-bootstrap";
import { api } from "../../shared/api";
import type { Habit } from "../../shared/types";

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    try { setHabits(await api<Habit[]>("/habits")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load habits."); }
  }
  useEffect(() => { void refresh(); }, []);

  async function createHabit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/habits", {
        method: "POST",
        body: JSON.stringify({
          title,
          days_of_week: days,
          starts_on: localDate(),
          preferred_start_time: startTime || null,
          preferred_end_time: endTime || null,
        }),
      });
      setTitle("");
      setDays([]);
      setStartTime("");
      setEndTime("");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save habit."); }
  }

  async function setActive(habit: Habit) {
    try {
      await api(`/habits/${habit.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !habit.is_active }) });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update habit."); }
  }

  async function remove(id: string) {
    try {
      await api(`/habits/${id}`, { method: "DELETE" });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete habit."); }
  }

  function toggleDay(day: number) {
    setDays((selected) => selected.includes(day) ? selected.filter((value) => value !== day) : [...selected, day].sort());
  }

  return (
    <>
      <div className="mb-4"><p className="muted-label mb-2">Small things, repeated</p><h1 className="page-title fw-bold">Habits</h1><p className="text-secondary">Set a recurring schedule. Your habits can appear on matching Daily Sheets.</p></div>
      {error && <Alert variant="danger">{error}</Alert>}
      <Card className="surface-card mb-3"><Card.Body className="p-4">
        <h2 className="h5 mb-3">Add a habit</h2>
        <Form onSubmit={createHabit}>
          <Form.Group className="mb-3"><Form.Label>Name</Form.Label><Form.Control required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Morning walk" /></Form.Group>
          <Form.Label>Repeat on</Form.Label>
          <div className="d-flex flex-wrap gap-3 mb-3">
            {weekDays.map((day, index) => <Form.Check key={day} type="checkbox" id={`day-${index}`} label={day.slice(0, 3)} checked={days.includes(index)} onChange={() => toggleDay(index)} />)}
          </div>
          <div className="row g-3 align-items-end">
            <Form.Group className="col-sm-4"><Form.Label>Preferred start</Form.Label><Form.Control type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Form.Group>
            <Form.Group className="col-sm-4"><Form.Label>Preferred end</Form.Label><Form.Control type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Form.Group>
            <div className="col-sm-4"><Button className="w-100" type="submit" disabled={days.length === 0 || Boolean(startTime) !== Boolean(endTime)}>Save habit</Button></div>
          </div>
        </Form>
      </Card.Body></Card>
      <Card className="surface-card"><ListGroup variant="flush">
        {habits.length === 0 ? <ListGroup.Item className="bg-transparent text-secondary py-4">No habits yet. Start with one small repeatable action.</ListGroup.Item> : habits.map((habit) => (
          <ListGroup.Item key={habit.id} className="bg-transparent py-3 d-flex align-items-center justify-content-between gap-3">
            <div><div className={habit.is_active ? "fw-semibold" : "fw-semibold text-secondary"}>{habit.title}</div><div className="small text-secondary">{habit.days_of_week.map((day) => weekDays[day].slice(0, 3)).join(", ")}{habit.preferred_start_time ? ` · ${habit.preferred_start_time.slice(0, 5)}` : ""}</div></div>
            <div className="d-flex gap-2"><Button size="sm" variant="outline-secondary" onClick={() => void setActive(habit)}>{habit.is_active ? "Pause" : "Resume"}</Button><Button size="sm" variant="outline-secondary" onClick={() => void remove(habit.id)}>Remove</Button></div>
          </ListGroup.Item>
        ))}
      </ListGroup></Card>
    </>
  );
}
