import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Card, Form } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../../shared/api";
import type { CalendarEvent, DailySheet, Habit, MoodEntry } from "../../shared/types";
import { Icon } from "../../shared/Icon";

interface SheetTask {
  title: string;
  completed: boolean;
}

interface ScheduleItem {
  id: string;
  itemId: string;
  itemType: "habit" | "event";
  title: string;
  startsAt: string;
  endsAt: string | null;
  completed: boolean;
}

type MoodPeriod = MoodEntry["period"];

interface MoodDraft {
  mood: string;
  note: string;
}

interface ScheduleCompletion {
  type: "schedule_completion";
  item_type: "habit" | "event";
  item_id: string;
  completed: true;
}

type ScheduleCompletionKey = `${"habit" | "event"}:${string}`;

const moodOptions = [["great", "😀"], ["good", "🙂"], ["okay", "😐"], ["low", "😔"]] as const;

function scheduleKey(itemType: ScheduleCompletion["item_type"], itemId: string): ScheduleCompletionKey {
  return `${itemType}:${itemId}`;
}

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dateInLocalTime(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function DailySheetPage() {
  const [searchParams] = useSearchParams();
  const sheetDate = searchParams.get("date") ?? localDate();
  const [sheet, setSheet] = useState<DailySheet | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [highlightInput, setHighlightInput] = useState("");
  const [tasks, setTasks] = useState<SheetTask[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [scheduleEvents, setScheduleEvents] = useState<CalendarEvent[]>([]);
  const [scheduledHabits, setScheduledHabits] = useState<Habit[]>([]);
  const [scheduleCompletions, setScheduleCompletions] = useState<Set<ScheduleCompletionKey>>(new Set());
  const [scheduleStateLoaded, setScheduleStateLoaded] = useState(false);
  const [savingScheduleItem, setSavingScheduleItem] = useState<string | null>(null);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [moodDrafts, setMoodDrafts] = useState<Record<MoodPeriod, MoodDraft>>({
    morning: { mood: "good", note: "" },
    evening: { mood: "good", note: "" },
  });
  const [moodEditing, setMoodEditing] = useState<Record<MoodPeriod, boolean>>({
    morning: false,
    evening: false,
  });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSheet(null);
    setNotes([]);
    setNoteInput("");
    setHighlights([]);
    setHighlightInput("");
    setTasks([]);
    setTaskInput("");
    setMoods([]);
    setScheduleCompletions(new Set());
    setScheduleStateLoaded(false);
    setMoodEditing({ morning: false, evening: false });
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
        setNotes((existing.notes ?? "").split("\n").map((note) => note.trim()).filter(Boolean));
        setHighlights(existing.highlights ?? []);
        setTasks((existing.tasks ?? []).flatMap((task) => (
          task.type === "schedule_completion"
            ? []
            : typeof task.title === "string" && task.title.trim()
              ? [{ title: task.title, completed: Boolean(task.completed) }]
              : []
        )));
        setScheduleCompletions(new Set((existing.tasks ?? []).flatMap((task): ScheduleCompletionKey[] => (
          task.type === "schedule_completion"
            && task.completed === true
            && (task.item_type === "habit" || task.item_type === "event")
            && typeof task.item_id === "string"
            ? [scheduleKey(task.item_type, task.item_id)]
            : []
        ))));
      }
      setScheduleEvents(events.filter((event) => dateInLocalTime(event.starts_at) === sheetDate));
      const morningMood = entries.find((entry) => entry.entry_date === sheetDate && entry.period === "morning");
      const eveningMood = entries.find((entry) => entry.entry_date === sheetDate && entry.period === "evening");
      setMoodDrafts({
        morning: { mood: morningMood?.mood ?? "good", note: morningMood?.note ?? "" },
        evening: { mood: eveningMood?.mood ?? "good", note: eveningMood?.note ?? "" },
      });
      const weekday = (new Date(`${sheetDate}T12:00:00`).getDay() + 6) % 7;
      setScheduledHabits(habits.filter((habit) => habit.is_active && habit.starts_on <= sheetDate && habit.days_of_week.includes(weekday)));
      setMoods(entries.filter((entry) => entry.entry_date === sheetDate));
      setScheduleStateLoaded(true);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load your Daily Sheet."));
  }, [sheetDate]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    const body = {
      notes: notes.length ? notes.join("\n") : null,
      highlights,
      tasks: sheetTasks(tasks, scheduleCompletions),
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

  function sheetTasks(currentTasks: SheetTask[], completedItems: Set<ScheduleCompletionKey>) {
    const completionRecords: ScheduleCompletion[] = [...completedItems].flatMap((key) => {
      const separator = key.indexOf(":");
      const itemType = key.slice(0, separator);
      const itemId = key.slice(separator + 1);
      if ((itemType !== "habit" && itemType !== "event") || !itemId) return [];
      return [{
        type: "schedule_completion" as const,
        item_type: itemType,
        item_id: itemId,
        completed: true as const,
      }];
    });
    return [...currentTasks, ...completionRecords];
  }

  async function setScheduleItemCompleted(item: ScheduleItem, completed: boolean) {
    const key = scheduleKey(item.itemType, item.itemId);
    const nextCompletions = new Set(scheduleCompletions);
    if (completed) nextCompletions.add(key);
    else nextCompletions.delete(key);
    setSavingScheduleItem(key);
    setError("");
    try {
      const savedSheet = sheet
        ? await api<DailySheet>(`/daily-sheets/${sheet.id}`, {
          method: "PATCH",
          body: JSON.stringify({ tasks: sheetTasks(tasks, nextCompletions) }),
        })
        : await api<DailySheet>("/daily-sheets", {
          method: "POST",
          body: JSON.stringify({
            sheet_date: sheetDate,
            notes: notes.length ? notes.join("\n") : null,
            highlights,
            tasks: sheetTasks(tasks, nextCompletions),
          }),
        });
      setSheet(savedSheet);
      setScheduleCompletions(nextCompletions);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this schedule update.");
    } finally {
      setSavingScheduleItem(null);
    }
  }

  async function saveMood(period: MoodPeriod) {
    setError("");
    const existingMood = moods.find((entry) => entry.entry_date === sheetDate && entry.period === period);
    const draft = moodDrafts[period];
    try {
      let savedMood: MoodEntry;
      if (existingMood) {
        savedMood = await api<MoodEntry>(`/moods/${existingMood.id}`, {
          method: "PATCH",
          body: JSON.stringify({ mood: draft.mood, note: draft.note || null }),
        });
      } else {
        savedMood = await api<MoodEntry>("/moods", {
          method: "POST",
          body: JSON.stringify({ entry_date: sheetDate, period, mood: draft.mood, note: draft.note || null }),
        });
      }
      setMoods((current) => {
        const withoutCurrent = current.filter((entry) => !(entry.entry_date === sheetDate && entry.period === period));
        return [...withoutCurrent, savedMood];
      });
      setMoodDrafts((current) => ({
        ...current,
        [period]: { mood: savedMood.mood, note: savedMood.note ?? "" },
      }));
      setMoodEditing((current) => ({ ...current, [period]: false }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your mood.");
    }
  }

  function cancelMoodEdit(period: MoodPeriod) {
    const savedMood = moods.find((entry) => entry.entry_date === sheetDate && entry.period === period);
    setMoodDrafts((current) => ({
      ...current,
      [period]: { mood: savedMood?.mood ?? "good", note: savedMood?.note ?? "" },
    }));
    setMoodEditing((current) => ({ ...current, [period]: false }));
  }

  function addNote() {
    const value = noteInput.trim();
    if (!value) return;
    setNotes((current) => [...current, value]);
    setNoteInput("");
  }

  function addHighlight() {
    const value = highlightInput.trim();
    if (!value) return;
    setHighlights((current) => [...current, value]);
    setHighlightInput("");
  }

  function addTask() {
    const title = taskInput.trim();
    if (!title) return;
    setTasks((current) => [...current, { title, completed: false }]);
    setTaskInput("");
  }

  const schedule: ScheduleItem[] = [
    ...scheduleEvents.map((event) => ({
      id: `event-${event.id}`,
      itemId: event.id,
      itemType: "event" as const,
      title: event.title,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      completed: scheduleCompletions.has(scheduleKey("event", event.id)),
    })),
    ...scheduledHabits.map((habit) => ({
      id: `habit-${habit.id}`,
      itemId: habit.id,
      itemType: "habit" as const,
      title: habit.title,
      startsAt: habit.preferred_start_time ? `${sheetDate}T${habit.preferred_start_time}` : "",
      endsAt: habit.preferred_end_time ? `${sheetDate}T${habit.preferred_end_time}` : null,
      completed: scheduleCompletions.has(scheduleKey("habit", habit.id)),
    })),
  ].sort((first, second) => {
    if (!first.startsAt) return 1;
    if (!second.startsAt) return -1;
    return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime();
  });
  const wins = tasks.filter((task) => task.completed);
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(new Date(`${sheetDate}T12:00:00`));

  return (
    <div>
      <div className="page-heading" data-tour="daily-sheet">
        <h1 className="page-title"><Icon name="today" className="heading-icon" />Your Daily Sheet — {weekday}</h1>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      {saved && <Alert variant="success">Your Daily Sheet is saved.</Alert>}
      {sheet?.is_edited_later && <Alert variant="info">This page was edited after its day.</Alert>}
      <Form onSubmit={save}>
        <div className="planner-grid daily-sheet-grid">
          <div className="planner-span-12">
            <Card className="surface-card accent-teal"><Card.Body>
              <p className="eyebrow"><Icon name="calendar" className="button-icon" />Your schedule</p>
              {schedule.length ? (
                <div className="daily-timeline-scroll" tabIndex={0} role="group" aria-label="Daily schedule timeline">
                  <div className="daily-timeline">
                    {schedule.map((item) => (
                      <div className={`daily-timeline-item${item.completed ? " completed" : ""}`} key={item.id}>
                        <span className="daily-timeline-time">
                          {item.startsAt ? formatTime(item.startsAt) : "Anytime"}
                          {item.endsAt ? ` – ${formatTime(item.endsAt)}` : ""}
                        </span>
                        <div className="daily-timeline-details">
                          <span className="daily-timeline-title">{item.title}</span>
                          <Form.Check
                            type="checkbox"
                            className="daily-timeline-check"
                            label={item.completed ? "Completed" : "Mark complete"}
                            checked={item.completed}
                            disabled={!scheduleStateLoaded || savingScheduleItem !== null}
                            onChange={(event) => void setScheduleItemCompleted(item, event.target.checked)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-secondary mb-0">An open day is a lovely place to begin.</p>}
            </Card.Body></Card>
          </div>
          <div className="planner-span-12">
            <Card className="surface-card accent-green"><Card.Body>
              <p className="eyebrow"><Icon name="today" className="button-icon" />Things to do</p>
              <div className="daily-entry-list daily-task-list">
                {tasks.map((task, index) => (
                  <div className={`daily-entry${task.completed ? " completed" : ""}`} key={`${index}-${task.title}`}>
                    <Form.Check
                      id={`daily-task-${index}`}
                      type="checkbox"
                      label={task.title}
                      checked={task.completed}
                      onChange={(event) => setTasks((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, completed: event.target.checked } : entry))}
                    />
                    <Button type="button" size="sm" variant="outline-secondary" aria-label={`Remove task: ${task.title}`} onClick={() => setTasks((current) => current.filter((_, entryIndex) => entryIndex !== index))}>×</Button>
                  </div>
                ))}
              </div>
              <div className="daily-entry-form daily-task-form">
                <Form.Control aria-label="Add something to do" placeholder="Add something to do…" maxLength={200} value={taskInput} onChange={(event) => setTaskInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTask(); } }} />
                <Button type="button" variant="outline-primary" onClick={addTask} disabled={!taskInput.trim()}>Add</Button>
              </div>
              {!tasks.length && <p className="small text-secondary mt-2 mb-0">Choose a few kind, doable steps.</p>}
            </Card.Body></Card>
          </div>
          <div className="planner-span-12">
            <Card className="surface-card accent-purple"><Card.Body>
              <p className="eyebrow"><Icon name="journal" className="button-icon" />Notes to self</p>
              <div className="daily-entry-list">
                {notes.map((note, index) => (
                  <div className="daily-entry" key={`${index}-${note}`}>
                    <span>{note}</span>
                    <Button type="button" size="sm" variant="outline-secondary" aria-label={`Remove note: ${note}`} onClick={() => setNotes((current) => current.filter((_, entryIndex) => entryIndex !== index))}>×</Button>
                  </div>
                ))}
              </div>
              <div className="daily-entry-form">
                <Form.Control aria-label="Add a note" placeholder="Add a thought or reminder…" maxLength={1000} value={noteInput} onChange={(event) => setNoteInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addNote(); } }} />
                <Button type="button" variant="outline-primary" onClick={addNote} disabled={!noteInput.trim()}>Add</Button>
              </div>
              {!notes.length && <p className="small text-secondary mt-2 mb-0">Keep little thoughts here, one at a time.</p>}
            </Card.Body></Card>
          </div>
          {(["morning", "evening"] as const).map((period) => {
            const existingMood = moods.find((entry) => entry.entry_date === sheetDate && entry.period === period);
            const label = period === "morning" ? "Beginning-of-day" : "End-of-day";
            return (
              <div className="planner-span-6" key={period}>
                <Card className="surface-card accent-rose h-100"><Card.Body>
                  <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
                    <p className="eyebrow mb-0"><Icon name="mood" className="button-icon" />{label} mood</p>
                    {existingMood && !moodEditing[period] && (
                      <Button type="button" size="sm" variant="outline-primary" onClick={() => setMoodEditing((current) => ({ ...current, [period]: true }))}>Edit</Button>
                    )}
                  </div>
                  {existingMood && !moodEditing[period] ? (
                    <div className="daily-mood-summary" aria-live="polite">
                      <span className="daily-mood-emoji" aria-hidden="true">
                        {moodOptions.find(([value]) => value === existingMood.mood)?.[1] ?? "•"}
                      </span>
                      <div>
                        <p className="text-capitalize fw-semibold mb-1">{existingMood.mood}</p>
                        {existingMood.note && <p className="text-secondary mb-0">{existingMood.note}</p>}
                      </div>
                    </div>
                  ) : moodEditing[period] ? (
                    <>
                      <p className="mb-3">How are you feeling this {period}?</p>
                      <div className="mood-options" role="group" aria-label={`Choose your ${period} mood`}>
                        {moodOptions.map(([value, emoji]) => (
                          <button
                            className={`mood-option${moodDrafts[period].mood === value ? " selected" : ""}`}
                            type="button"
                            key={value}
                            aria-label={value}
                            aria-pressed={moodDrafts[period].mood === value}
                            onClick={() => setMoodDrafts((current) => ({
                              ...current,
                              [period]: { ...current[period], mood: value },
                            }))}
                          >{emoji}</button>
                        ))}
                      </div>
                      <div className="daily-mood-footer">
                        <Form.Control
                          className="mt-3"
                          aria-label={`Optional ${period} mood note`}
                          placeholder="Add a note, if you’d like…"
                          maxLength={2000}
                          value={moodDrafts[period].note}
                          onChange={(event) => setMoodDrafts((current) => ({
                            ...current,
                            [period]: { ...current[period], note: event.target.value },
                          }))}
                        />
                        <div className="d-flex align-items-center gap-2 mt-3">
                          <Button type="button" size="sm" onClick={() => void saveMood(period)}>Save check-in</Button>
                          <Button type="button" size="sm" variant="outline-secondary" onClick={() => cancelMoodEdit(period)}>Cancel</Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="daily-mood-empty">
                      <span className="text-secondary">Not checked in</span>
                      <Button type="button" size="sm" variant="outline-primary" onClick={() => setMoodEditing((current) => ({ ...current, [period]: true }))}>
                        Add check-in
                      </Button>
                    </div>
                  )}
                </Card.Body></Card>
              </div>
            );
          })}
          <div className="planner-span-12">
            <Card className="surface-card accent-amber"><Card.Body>
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <p className="eyebrow mb-0"><Icon name="sparkles" className="button-icon" />Daily Wins &amp; Highlights</p>
              </div>
              <div className="daily-wins-highlights">
                <section>
                  <h2 className="h6 mb-3">Completed tasks</h2>
                  {wins.length ? (
                    <ul className="daily-wins-list mb-0">
                      {wins.map((task, index) => <li key={`${index}-${task.title}`}>{task.title}</li>)}
                    </ul>
                  ) : <p className="small text-secondary mb-0">Completed tasks will appear here.</p>}
                </section>
                <section>
                  <h2 className="h6 mb-3">Highlights</h2>
                  <div className="daily-entry-list">
                    {highlights.map((highlight, index) => (
                      <div className="daily-entry" key={`${index}-${highlight}`}>
                        <span>{highlight}</span>
                        <Button type="button" size="sm" variant="outline-secondary" aria-label={`Remove highlight: ${highlight}`} onClick={() => setHighlights((current) => current.filter((_, entryIndex) => entryIndex !== index))}>×</Button>
                      </div>
                    ))}
                  </div>
                  <div className="daily-entry-form">
                    <Form.Control aria-label="Add a highlight" placeholder="Add something you want to remember…" maxLength={1000} value={highlightInput} onChange={(event) => setHighlightInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addHighlight(); } }} />
                    <Button type="button" variant="outline-primary" onClick={addHighlight} disabled={!highlightInput.trim()}>Add</Button>
                  </div>
                  {!highlights.length && <p className="small text-secondary mt-2 mb-0">Save moments you want to remember.</p>}
                </section>
              </div>
              <div className="d-flex justify-content-end mt-4">
                <Button type="submit" className="px-4">Save today’s page</Button>
              </div>
            </Card.Body></Card>
          </div>
        </div>
      </Form>
    </div>
  );
}
