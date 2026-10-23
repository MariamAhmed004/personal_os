import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Card, Form, Stack } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../../shared/api";
import type { CalendarEvent, DailySheet, Habit, MoodEntry } from "../../shared/types";

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dateInLocalTime(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function DailySheetPage() {
  const [searchParams] = useSearchParams();
  const sheetDate = searchParams.get("date") ?? localDate();
  const [sheet, setSheet] = useState<DailySheet | null>(null);
  const [notes, setNotes] = useState("");
  const [highlightsText, setHighlightsText] = useState("");
  const [tasksText, setTasksText] = useState("");
  const [showHighlights, setShowHighlights] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [scheduleEvents, setScheduleEvents] = useState<CalendarEvent[]>([]);
  const [scheduledHabits, setScheduledHabits] = useState<Habit[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSheet(null);
    setNotes("");
    setHighlightsText("");
    setTasksText("");
    setShowHighlights(false);
    setShowTasks(false);
    setShowNotes(false);
    setError("");
    Promise.all([
      api<DailySheet>(`/daily-sheets/by-date/${sheetDate}`).catch((cause: unknown) => {
        if (cause instanceof ApiError && cause.status === 404) return null;
        throw cause;
      }),
      api<CalendarEvent[]>("/calendar/events"),
      api<Habit[]>("/habits"),
      api<MoodEntry[]>("/moods"),
    ]).then(([existing, events, habits, entries]) => {
      setSheet(existing);
      if (existing) {
        setNotes(existing.notes ?? "");
        setHighlightsText(existing.highlights?.join("\n") ?? "");
        setTasksText(existing.tasks?.map((task) => task.title ?? "").join("\n") ?? "");
        setShowHighlights(Boolean(existing.highlights?.length));
        setShowTasks(Boolean(existing.tasks?.length));
        setShowNotes(Boolean(existing.notes));
      }
      setScheduleEvents(events.filter((event) => dateInLocalTime(event.starts_at) === sheetDate));
      const weekday = (new Date(`${sheetDate}T12:00:00`).getDay() + 6) % 7;
      setScheduledHabits(habits.filter((habit) => habit.is_active && habit.starts_on <= sheetDate && habit.days_of_week.includes(weekday)));
      setMoods(entries.filter((entry) => entry.entry_date === sheetDate));
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load your Daily Sheet."));
  }, [sheetDate]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    const body = {
      notes: showNotes ? notes || null : undefined,
      highlights: showHighlights ? highlightsText.split("\n").map((line) => line.trim()).filter(Boolean) : undefined,
      tasks: showTasks ? tasksText.split("\n").map((title) => title.trim()).filter(Boolean).map((title) => ({ title, completed: false })) : undefined,
    };
    try {
      const result = sheet
        ? await api<DailySheet>(`/daily-sheets/${sheet.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await api<DailySheet>("/daily-sheets", { method: "POST", body: JSON.stringify({ ...body, sheet_date: sheetDate }) });
      setSheet(result);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your Daily Sheet.");
    }
  }

  return (
    <>
      <div className="mb-4">
        <p className="muted-label mb-2">{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${sheetDate}T12:00:00`))}</p>
        <h1 className="page-title fw-bold">Daily Sheet</h1>
        <p className="text-secondary">A flexible workspace for the day ahead.</p>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      {saved && <Alert variant="success">Your Daily Sheet is saved.</Alert>}
      {sheet?.is_edited_later && <Alert variant="info">Edited Later</Alert>}
      {(scheduleEvents.length > 0 || scheduledHabits.length > 0) && <Card className="surface-card mb-3"><Card.Body className="p-4">
        <p className="muted-label">Schedule</p>
        {scheduleEvents.map((event) => <div className="d-flex justify-content-between gap-3 py-1" key={event.id}><span>{event.title}</span><span className="text-secondary">{new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></div>)}
        {scheduledHabits.map((habit) => <div className="d-flex justify-content-between gap-3 py-1" key={habit.id}><span>{habit.title}</span><span className="text-secondary">{habit.preferred_start_time?.slice(0, 5) ?? "Habit"}</span></div>)}
      </Card.Body></Card>}
      {moods.length > 0 && <Card className="surface-card mb-3"><Card.Body className="p-4">
        <p className="muted-label">Mood</p>
        {moods.map((entry) => <p className="mb-1" key={entry.id}><span className="text-capitalize">{entry.period}</span>: {entry.mood}{entry.note ? <span className="text-secondary"> — {entry.note}</span> : null}</p>)}
      </Card.Body></Card>}
      <div className="d-flex flex-wrap gap-2 mb-3">
        {!showHighlights && <Button variant="outline-secondary" size="sm" onClick={() => setShowHighlights(true)}>+ Highlights</Button>}
        {!showTasks && <Button variant="outline-secondary" size="sm" onClick={() => setShowTasks(true)}>+ Tasks</Button>}
        {!showNotes && <Button variant="outline-secondary" size="sm" onClick={() => setShowNotes(true)}>+ Notes</Button>}
      </div>
      <Form onSubmit={save}>
        <Stack gap={3}>
          {showHighlights && <Card className="surface-card"><Card.Body className="p-4">
            <Form.Group>
              <Form.Label className="muted-label">Highlights</Form.Label>
              <Form.Control as="textarea" rows={3} placeholder={"What would make today feel meaningful?\nOne highlight per line"} value={highlightsText} onChange={(e) => setHighlightsText(e.target.value)} />
            </Form.Group>
          </Card.Body></Card>}
          {showTasks && <Card className="surface-card"><Card.Body className="p-4">
            <Form.Group>
              <Form.Label className="muted-label">Tasks</Form.Label>
              <Form.Control as="textarea" rows={4} placeholder={"Add a task per line"} value={tasksText} onChange={(e) => setTasksText(e.target.value)} />
            </Form.Group>
          </Card.Body></Card>}
          {showNotes && <Card className="surface-card"><Card.Body className="p-4">
            <Form.Group>
              <Form.Label className="muted-label">Notes</Form.Label>
              <Form.Control as="textarea" rows={5} placeholder="Capture anything else on your mind…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Form.Group>
          </Card.Body></Card>}
        </Stack>
        <Button type="submit" className="mt-3">Save Daily Sheet</Button>
      </Form>
    </>
  );
}
