import type { BacklogItem, CalendarEvent, DailySheet, Habit, MoodEntry, Reflection } from "../shared/types";

export interface DemoFixtures {
  user: { id: string; display_name: string };
  events: CalendarEvent[];
  backlogItems: BacklogItem[];
  dailySheets: DailySheet[];
  habits: Habit[];
  moods: MoodEntry[];
  reflections: Reflection[];
}

function localDate(offset = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localDateTime(dayOffset: number, hour: number, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString();
}

function weekday(offset: number) {
  return (new Date(`${localDate(offset)}T12:00:00`).getDay() + 6) % 7;
}

export function createDemoFixtures(): DemoFixtures {
  const today = localDate();
  const yesterday = localDate(-1);
  const weekdayHabitDays = [weekday(0), weekday(1), weekday(2), weekday(3), weekday(4)];
  const alternateHabitDays = [weekday(0), weekday(2), weekday(4)];
  const currentTime = new Date().toISOString();
  return {
    user: { id: "demo-user", display_name: "Demo" },
    events: [
      {
        id: "demo-event-1",
        title: "Morning pages & coffee",
        event_type: "appointment",
        description: "A quiet start before the day gets busy.",
        starts_at: localDateTime(0, 8, 30),
        ends_at: localDateTime(0, 9, 0),
        location: "Home",
      },
      {
        id: "demo-event-2",
        title: "Portfolio focus session",
        event_type: "workshop",
        description: "A little dedicated time for the next project.",
        starts_at: localDateTime(0, 14),
        ends_at: localDateTime(0, 15, 30),
        location: null,
      },
      {
        id: "demo-event-3",
        title: "Catch up with Maya",
        event_type: "custom",
        description: "Tea and a proper conversation.",
        starts_at: localDateTime(1, 17, 30),
        ends_at: localDateTime(1, 18, 30),
        location: "Juniper Cafe",
      },
      {
        id: "demo-event-4",
        title: "Design community workshop",
        event_type: "workshop",
        description: "Bring one idea to share.",
        starts_at: localDateTime(3, 10),
        ends_at: localDateTime(3, 12),
        location: "Community Studio",
      },
      {
        id: "demo-event-5",
        title: "A little open space",
        event_type: "custom",
        description: null,
        starts_at: localDateTime(-2, 11),
        ends_at: localDateTime(-2, 11, 30),
        location: null,
      },
    ],
    backlogItems: [
      { id: "demo-backlog-1", title: "Refresh my portfolio", description: "Choose three projects to feature first.", is_completed: false },
      { id: "demo-backlog-2", title: "Try a new walking route", description: "Take the path by the water.", is_completed: false },
      { id: "demo-backlog-3", title: "Sort photos from the weekend", description: null, is_completed: true },
    ],
    dailySheets: [
      {
        id: "demo-sheet-today",
        sheet_date: today,
        tasks: [
          { title: "Take a short walk", completed: true },
          { title: "Spend 30 minutes on my portfolio", completed: false },
          { type: "schedule_completion", item_type: "habit", item_id: "demo-habit-1", completed: true },
        ],
        highlights: ["Made space for a slower morning", "Finished the first draft"],
        notes: "One thing at a time is enough.",
        is_edited_later: false,
        created_at: currentTime,
        updated_at: currentTime,
      },
      {
        id: "demo-sheet-yesterday",
        sheet_date: yesterday,
        tasks: [
          { title: "Reply to the studio email", completed: true },
          { title: "Prepare lunch for tomorrow", completed: true },
          { title: "Read a few pages", completed: false },
        ],
        highlights: ["A good conversation with a friend"],
        notes: "The day felt more manageable after writing it down.",
        is_edited_later: false,
        created_at: currentTime,
        updated_at: currentTime,
      },
    ],
    habits: [
      {
        id: "demo-habit-1",
        title: "Morning stretch",
        days_of_week: weekdayHabitDays,
        preferred_start_time: "08:00",
        preferred_end_time: "08:15",
        starts_on: localDate(-30),
        is_active: true,
      },
      {
        id: "demo-habit-2",
        title: "Read for a little while",
        days_of_week: alternateHabitDays,
        preferred_start_time: "20:30",
        preferred_end_time: "21:00",
        starts_on: localDate(-18),
        is_active: true,
      },
      {
        id: "demo-habit-3",
        title: "Plan the week",
        days_of_week: [weekday(6)],
        preferred_start_time: null,
        preferred_end_time: null,
        starts_on: localDate(-45),
        is_active: false,
      },
    ],
    moods: [
      { id: "demo-mood-1", entry_date: today, period: "morning", mood: "good", note: "Feeling steady and ready to begin." },
      { id: "demo-mood-2", entry_date: yesterday, period: "evening", mood: "great", note: "Proud of the small things I finished." },
      { id: "demo-mood-3", entry_date: localDate(-2), period: "morning", mood: "okay", note: null },
      { id: "demo-mood-4", entry_date: localDate(-3), period: "evening", mood: "good", note: "A restful evening." },
    ],
    reflections: [
      {
        id: "demo-reflection-1",
        period_type: "weekly",
        period_start: localDate(-6),
        content: "I felt most like myself when I made room for breaks. Next week, I want to keep my plans simple and protect a little creative time.",
        created_at: currentTime,
        updated_at: currentTime,
      },
    ],
  };
}
