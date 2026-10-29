import { ApiError } from "../shared/api-error";
import type { BacklogItem, CalendarEvent, DailySheet, Habit, MoodEntry, Reflection } from "../shared/types";
import { createDemoFixtures, type DemoFixtures } from "./fixtures";

const demoData: DemoFixtures = createDemoFixtures();
let nextId = 1;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function getBody(options: RequestInit): Record<string, unknown> {
  if (typeof options.body !== "string") return {};
  const parsed: unknown = JSON.parse(options.body);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ApiError(400, "The demo request had an invalid body.");
  }
  return parsed as Record<string, unknown>;
}

function requiredString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value !== "string" || !value.trim()) throw new ApiError(400, `A valid ${key} is required.`);
  return value;
}

function nullableString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (value === null || value === undefined || typeof value === "string") return value ?? null;
  throw new ApiError(400, `A valid ${key} is required.`);
}

function notFound(kind: string): never {
  throw new ApiError(404, `That demo ${kind} could not be found.`);
}

function makeId(kind: string) {
  nextId += 1;
  return `demo-${kind}-new-${nextId}`;
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function timestamps() {
  const now = new Date().toISOString();
  return { created_at: now, updated_at: now };
}

function saveDailySheet(body: Record<string, unknown>, existing?: DailySheet): DailySheet {
  const sheetDate = typeof body.sheet_date === "string" ? body.sheet_date : existing?.sheet_date;
  if (!sheetDate) throw new ApiError(400, "A valid sheet_date is required.");
  const record: DailySheet = {
    id: existing?.id ?? makeId("sheet"),
    sheet_date: sheetDate,
    tasks: Array.isArray(body.tasks) ? body.tasks as DailySheet["tasks"] : existing?.tasks ?? [],
    highlights: Array.isArray(body.highlights) ? body.highlights.filter((item): item is string => typeof item === "string") : existing?.highlights ?? [],
    notes: typeof body.notes === "string" || body.notes === null ? body.notes : existing?.notes ?? null,
    is_edited_later: sheetDate < today(),
    ...timestamps(),
    ...(existing ? { created_at: existing.created_at } : {}),
  };
  const existingIndex = demoData.dailySheets.findIndex((sheet) => sheet.id === record.id);
  if (existingIndex === -1) demoData.dailySheets.push(record);
  else demoData.dailySheets[existingIndex] = record;
  return record;
}

function handleCalendar(path: string[], method: string, body: Record<string, unknown>) {
  if (path.length === 2 && method === "GET") return clone(demoData.events);
  if (path.length === 2 && method === "POST") {
    const record: CalendarEvent = {
      id: makeId("event"),
      title: requiredString(body, "title"),
      event_type: body.event_type === "interview" || body.event_type === "workshop" || body.event_type === "appointment" || body.event_type === "graduation" ? body.event_type : "custom",
      description: nullableString(body, "description"),
      starts_at: requiredString(body, "starts_at"),
      ends_at: requiredString(body, "ends_at"),
      location: nullableString(body, "location"),
    };
    demoData.events.push(record);
    return clone(record);
  }
  if (path.length === 3) {
    const index = demoData.events.findIndex((event) => event.id === path[2]);
    if (index === -1) return notFound("event");
    if (method === "PATCH") {
      const current = demoData.events[index];
      demoData.events[index] = {
        ...current,
        title: typeof body.title === "string" ? body.title : current.title,
        event_type: body.event_type === "interview" || body.event_type === "workshop" || body.event_type === "appointment" || body.event_type === "graduation" || body.event_type === "custom" ? body.event_type : current.event_type,
        starts_at: typeof body.starts_at === "string" ? body.starts_at : current.starts_at,
        ends_at: typeof body.ends_at === "string" ? body.ends_at : current.ends_at,
      };
      return clone(demoData.events[index]);
    }
    if (method === "DELETE") {
      demoData.events.splice(index, 1);
      return undefined;
    }
  }
  return notFound("calendar route");
}

function handleBacklog(path: string[], method: string, body: Record<string, unknown>) {
  if (path.length === 2 && method === "GET") return clone(demoData.backlogItems);
  if (path.length === 2 && method === "POST") {
    const record: BacklogItem = {
      id: makeId("backlog"),
      title: requiredString(body, "title"),
      description: nullableString(body, "description"),
      is_completed: false,
    };
    demoData.backlogItems.unshift(record);
    return clone(record);
  }
  if (path.length === 3) {
    const index = demoData.backlogItems.findIndex((item) => item.id === path[2]);
    if (index === -1) return notFound("backlog item");
    if (method === "PATCH") {
      const item = demoData.backlogItems[index];
      demoData.backlogItems[index] = {
        ...item,
        ...(typeof body.title === "string" ? { title: body.title } : {}),
        ...(typeof body.description === "string" || body.description === null ? { description: body.description } : {}),
        ...(typeof body.is_completed === "boolean" ? { is_completed: body.is_completed } : {}),
      };
      return clone(demoData.backlogItems[index]);
    }
    if (method === "DELETE") {
      demoData.backlogItems.splice(index, 1);
      return undefined;
    }
  }
  return notFound("backlog route");
}

function handleHabits(path: string[], method: string, body: Record<string, unknown>) {
  if (path.length === 1 && method === "GET") return clone(demoData.habits);
  if (path.length === 1 && method === "POST") {
    const days = body.days_of_week;
    if (!Array.isArray(days) || !days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) {
      throw new ApiError(400, "Choose at least one valid day for this demo habit.");
    }
    const record: Habit = {
      id: makeId("habit"),
      title: requiredString(body, "title"),
      days_of_week: days as number[],
      preferred_start_time: nullableString(body, "preferred_start_time"),
      preferred_end_time: nullableString(body, "preferred_end_time"),
      starts_on: typeof body.starts_on === "string" ? body.starts_on : today(),
      is_active: true,
    };
    demoData.habits.unshift(record);
    return clone(record);
  }
  if (path.length === 2) {
    const index = demoData.habits.findIndex((habit) => habit.id === path[1]);
    if (index === -1) return notFound("habit");
    if (method === "PATCH" && typeof body.is_active === "boolean") {
      demoData.habits[index] = { ...demoData.habits[index], is_active: body.is_active };
      return clone(demoData.habits[index]);
    }
    if (method === "DELETE") {
      demoData.habits.splice(index, 1);
      return undefined;
    }
  }
  return notFound("habits route");
}

function handleDailySheets(path: string[], method: string, body: Record<string, unknown>) {
  if (path.length === 1 && method === "GET") return clone(demoData.dailySheets);
  if (path[1] === "by-date" && path.length === 3 && method === "GET") {
    const sheet = demoData.dailySheets.find((entry) => entry.sheet_date === path[2]);
    if (!sheet) return notFound("Daily Sheet");
    return clone(sheet);
  }
  if (path.length === 1 && method === "POST") return clone(saveDailySheet(body));
  if (path.length === 2 && method === "PATCH") {
    const existing = demoData.dailySheets.find((sheet) => sheet.id === path[1]);
    if (!existing) return notFound("Daily Sheet");
    return clone(saveDailySheet(body, existing));
  }
  return notFound("Daily Sheet route");
}

function handleMoods(path: string[], method: string, body: Record<string, unknown>) {
  if (path.length === 1 && method === "GET") return clone(demoData.moods);
  if (path.length === 1 && method === "POST") {
    const period = body.period;
    if (period !== "morning" && period !== "evening") throw new ApiError(400, "Choose a valid mood check-in period.");
    const record: MoodEntry = {
      id: makeId("mood"),
      entry_date: requiredString(body, "entry_date"),
      period,
      mood: requiredString(body, "mood"),
      note: nullableString(body, "note"),
    };
    const existingIndex = demoData.moods.findIndex((entry) => entry.entry_date === record.entry_date && entry.period === record.period);
    if (existingIndex === -1) demoData.moods.unshift(record);
    else {
      record.id = demoData.moods[existingIndex].id;
      demoData.moods[existingIndex] = record;
    }
    return clone(record);
  }
  if (path.length === 2) {
    const index = demoData.moods.findIndex((entry) => entry.id === path[1]);
    if (index === -1) return notFound("mood");
    if (method === "PATCH") {
      const mood = demoData.moods[index];
      demoData.moods[index] = {
        ...mood,
        ...(typeof body.mood === "string" ? { mood: body.mood } : {}),
        ...(typeof body.note === "string" || body.note === null ? { note: body.note } : {}),
      };
      return clone(demoData.moods[index]);
    }
    if (method === "DELETE") {
      demoData.moods.splice(index, 1);
      return undefined;
    }
  }
  return notFound("moods route");
}

function handleReflections(path: string[], method: string, body: Record<string, unknown>) {
  if (path.length === 1 && method === "GET") return clone(demoData.reflections);
  if (path.length === 1 && method === "POST") {
    const periodType = body.period_type;
    if (periodType !== "weekly" && periodType !== "monthly") throw new ApiError(400, "Choose a valid reflection period.");
    const record: Reflection = {
      id: makeId("reflection"),
      period_type: periodType,
      period_start: requiredString(body, "period_start"),
      content: requiredString(body, "content"),
      ...timestamps(),
    };
    demoData.reflections.unshift(record);
    return clone(record);
  }
  if (path.length === 2) {
    const index = demoData.reflections.findIndex((reflection) => reflection.id === path[1]);
    if (index === -1) return notFound("reflection");
    if (method === "PATCH") {
      demoData.reflections[index] = { ...demoData.reflections[index], content: requiredString(body, "content"), updated_at: new Date().toISOString() };
      return clone(demoData.reflections[index]);
    }
    if (method === "DELETE") {
      demoData.reflections.splice(index, 1);
      return undefined;
    }
  }
  return notFound("reflections route");
}

export async function demoApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const parts = path.split("?")[0].split("/").filter(Boolean).map(decodeURIComponent);
  const body = getBody(options);
  let result: unknown;

  if (parts[0] === "users" && parts[1] === "me" && method === "GET") result = clone(demoData.user);
  else if (parts[0] === "calendar" && parts[1] === "events") result = handleCalendar(parts, method, body);
  else if (parts[0] === "backlog" && parts[1] === "items") result = handleBacklog(parts, method, body);
  else if (parts[0] === "habits") result = handleHabits(parts, method, body);
  else if (parts[0] === "daily-sheets") result = handleDailySheets(parts, method, body);
  else if (parts[0] === "moods") result = handleMoods(parts, method, body);
  else if (parts[0] === "reflections") result = handleReflections(parts, method, body);
  else if (parts[0] === "ai" && parts[1] === "chat" && parts.length === 3 && parts[2] === "history" && method === "GET") result = [];
  else if (parts[0] === "ai" && parts[1] === "chat") {
    throw new ApiError(503, "The AI assistant needs the full local application. Your message was not sent or saved.");
  } else {
    return notFound("API route");
  }
  return clone(result) as T;
}
