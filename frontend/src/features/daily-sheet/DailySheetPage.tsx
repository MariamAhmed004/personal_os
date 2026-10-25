import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../../shared/api";
import type { CalendarEvent, DailySheet, Habit, MoodEntry } from "../../shared/types";
import { Icon } from "../../shared/Icon";

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
  const moodPeriod: "morning" | "evening" = new Date().getHours() < 15 ? "morning" : "evening";
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
  const [selectedMood, setSelectedMood] = useState("good");
  const [moodNote, setMoodNote] = useState("");
  const [moodSaved, setMoodSaved] = useState(false);
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
      const todayMood = entries.find((entry) => entry.entry_date === sheetDate && entry.period === moodPeriod);
      setSelectedMood(todayMood?.mood ?? "good");
      setMoodNote(todayMood?.note ?? "");
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

  async function saveMood() {
    setError("");
    setMoodSaved(false);
    const existingMood = moods.find((entry) => entry.entry_date === sheetDate && entry.period === moodPeriod);
    try {
      if (existingMood) {
        await api(`/moods/${existingMood.id}`, { method: "PATCH", body: JSON.stringify({ mood: selectedMood, note: moodNote || null }) });
      } else {
        await api("/moods", { method: "POST", body: JSON.stringify({ entry_date: sheetDate, period: moodPeriod, mood: selectedMood, note: moodNote || null }) });
      }
      setMoodSaved(true);
      setMoods((current) => {
        const withoutCurrent = current.filter((entry) => !(entry.entry_date === sheetDate && entry.period === moodPeriod));
        return [...withoutCurrent, { id: existingMood?.id ?? "saved", entry_date: sheetDate, period: moodPeriod, mood: selectedMood, note: moodNote || null }];
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your mood.");
    }
  }

  return (
    <div>
      <div className="page-heading">
        <p className="eyebrow mb-2">{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${sheetDate}T12:00:00`))}</p>
        <h1 className="page-title"><Icon name="today" className="heading-icon" />Your Daily Sheet</h1>
        <p className="page-subtitle">A gentle plan for the day you're living.</p>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      {saved && <Alert variant="success">Your Daily Sheet is saved.</Alert>}
      {sheet?.is_edited_later && <Alert variant="info">This page was edited after its day.</Alert>}
      <Form onSubmit={save}>
        <div className="planner-grid">
          <div className="planner-span-8">
            <Card className="surface-card accent-green h-100"><Card.Body>
              <p className="eyebrow">Today’s focus</p>
              <Form.Group>
                <Form.Label className="fw-semibold">What would make today feel meaningful?</Form.Label>
                <Form.Control as="textarea" rows={3} placeholder={"One intention per line"} value={highlightsText} onChange={(e) => { setHighlightsText(e.target.value); setShowHighlights(true); }} />
              </Form.Group>
              <p className="small text-secondary mt-2 mb-0">Keep it kind and achievable. Your first intention appears on Home.</p>
            </Card.Body></Card>
          </div>
          <div className="planner-span-4">
            <Card className="surface-card accent-rose h-100"><Card.Body>
              <p className="eyebrow"><Icon name="mood" className="button-icon" />A moment for you</p>
              <p className="mb-3">How are you feeling this {moodPeriod}?</p>
              <div className="mood-options" role="group" aria-label="Choose your mood">
                {[["great", "😀"], ["good", "🙂"], ["okay", "😐"], ["low", "😔"]].map(([value, emoji]) => (
                  <button className={`mood-option${selectedMood === value ? " selected" : ""}`} type="button" key={value} aria-label={value} aria-pressed={selectedMood === value} onClick={() => setSelectedMood(value)}>{emoji}</button>
                ))}
              </div>
              <div>
                <Form.Control className="mt-3" aria-label="Optional mood note" placeholder="Add a note, if you'd like…" maxLength={2000} value={moodNote} onChange={(e) => setMoodNote(e.target.value)} />
                <div className="d-flex align-items-center justify-content-between mt-3">
                  <Button type="button" size="sm" variant="outline-primary" onClick={() => void saveMood()}>Save check-in</Button>
                  {moodSaved && <span className="small text-success">Saved with care</span>}
                </div>
              </div>
            </Card.Body></Card>
          </div>
          <div className="planner-span-6">
            <Card className="surface-card accent-teal"><Card.Body>
              <p className="eyebrow">Your schedule</p>
              {scheduleEvents.length || scheduledHabits.length ? (
                <div className="d-grid gap-2">
                  {[...scheduleEvents.map((event) => ({ id: event.id, title: event.title, time: event.starts_at, type: "event" })), ...scheduledHabits.map((habit) => ({ id: habit.id, title: habit.title, time: habit.preferred_start_time ?? "", type: "habit" }))]
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((item) => <div className="d-flex align-items-center gap-3 soft-panel py-2" key={`${item.type}-${item.id}`}><span className="small text-success fw-semibold">{item.time.includes("T") ? new Date(item.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : item.time.slice(0, 5) || "Anytime"}</span><span>{item.title}</span></div>)}
                </div>
              ) : <p className="text-secondary mb-0">An open day is a lovely place to begin.</p>}
            </Card.Body></Card>
          </div>
          <div className="planner-span-6">
            <Card className="surface-card accent-purple"><Card.Body>
              <p className="eyebrow">Notes to self</p>
              <Form.Control as="textarea" rows={6} placeholder="Capture a thought, a reminder, or anything on your mind…" value={notes} onChange={(e) => { setNotes(e.target.value); setShowNotes(true); }} />
            </Card.Body></Card>
          </div>
          <div className="planner-span-12">
            <Card className="surface-card"><Card.Body>
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <p className="eyebrow mb-1">Little wins</p>
                  <p className="small text-secondary mb-2">Add a win or a small next step on each line.</p>
                  <Form.Control className="wins-input" as="textarea" rows={2} placeholder="One thought per line" value={tasksText} onChange={(e) => { setTasksText(e.target.value); setShowTasks(true); }} />
                </div>
                <Button type="submit" className="px-4">Save today's page</Button>
              </div>
            </Card.Body></Card>
          </div>
        </div>
      </Form>
    </div>
  );
}
