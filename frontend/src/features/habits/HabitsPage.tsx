import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";
import { api } from "../../shared/api";
import type { Habit } from "../../shared/types";
import { Icon } from "../../shared/Icon";

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
      <div className="page-heading"><p className="eyebrow mb-2">Small things, repeated</p><h1 className="page-title"><Icon name="habits" className="heading-icon" />Habits with room to grow</h1><p className="page-subtitle">A rhythm that supports you, not another thing to keep up with.</p></div>
      {error && <Alert variant="danger">{error}</Alert>}
      <Card className="surface-card accent-green mb-4"><Card.Body>
        <p className="eyebrow mb-3">Plant a new seed</p>
        <Form onSubmit={createHabit}>
          <div className="row g-3">
            <Form.Group className="col-lg-5"><Form.Label>What would you like to make space for?</Form.Label><Form.Control required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A morning walk" /></Form.Group>
            <div className="col-lg-7">
              <Form.Label>Choose the days that feel right</Form.Label>
              <div className="d-flex flex-wrap gap-2">
                {weekDays.map((day, index) => <Form.Check className="day-choice" key={day} type="checkbox" id={`day-${index}`} label={day.slice(0, 3)} checked={days.includes(index)} onChange={() => toggleDay(index)} />)}
              </div>
            </div>
            <Form.Group className="col-sm-4 col-lg-3"><Form.Label>Start time (optional)</Form.Label><Form.Control type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Form.Group>
            <Form.Group className="col-sm-4 col-lg-3"><Form.Label>End time (optional)</Form.Label><Form.Control type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Form.Group>
            <div className="col-sm-4 col-lg-3 d-flex align-items-end"><Button className="w-100" type="submit" disabled={days.length === 0 || Boolean(startTime) !== Boolean(endTime)}>Add this habit</Button></div>
          </div>
        </Form>
      </Card.Body></Card>
      {habits.length === 0 ? <Card className="surface-card"><Card.Body className="p-4 text-secondary">Your habits will grow here. Begin with one small, repeatable action.</Card.Body></Card> : (
        <div className="planner-grid">
          {habits.map((habit) => (
            <div className="planner-span-6" key={habit.id}>
              <Card className={`surface-card${habit.is_active ? " accent-green" : ""}`}>
                <Card.Body>
                  <div className="d-flex align-items-start justify-content-between gap-3">
                    <div><h2 className={`h5 mb-1${habit.is_active ? "" : " text-secondary"}`}>{habit.title}</h2><p className="small text-secondary mb-3">{habit.is_active ? "Your gentle weekly rhythm" : "On pause"}{habit.preferred_start_time ? ` · ${habit.preferred_start_time.slice(0, 5)}` : ""}</p></div>
                    <span className={`badge rounded-pill ${habit.is_active ? "text-bg-success" : "text-bg-light"}`}>{habit.is_active ? "In rhythm" : "Paused"}</span>
                  </div>
                  <div className="week-dots mb-4" aria-label="Scheduled days of the week">
                    {weekDays.map((day, index) => <span key={day} className={`week-dot${habit.days_of_week.includes(index) && habit.is_active ? " active" : ""}`} title={`${day}${habit.days_of_week.includes(index) ? ", scheduled" : ""}`}>{day.slice(0, 1)}</span>)}
                  </div>
                  <div className="d-flex gap-2">
                    <Button size="sm" variant={habit.is_active ? "outline-warning" : "outline-success"} onClick={() => void setActive(habit)}>{habit.is_active ? "Pause gently" : "Resume"}</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => void remove(habit.id)}>Remove</Button>
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
