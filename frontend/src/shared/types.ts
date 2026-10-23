export interface CalendarEvent {
  id: string;
  title: string;
  event_type: "interview" | "workshop" | "appointment" | "graduation" | "custom";
  description: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
}

export interface BacklogItem {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
}

export interface DailySheet {
  id: string;
  sheet_date: string;
  tasks: Array<{ title?: string; completed?: boolean }> | null;
  highlights: string[] | null;
  notes: string | null;
  is_edited_later: boolean;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  title: string;
  days_of_week: number[];
  preferred_start_time: string | null;
  preferred_end_time: string | null;
  starts_on: string;
  is_active: boolean;
}

export interface MoodEntry {
  id: string;
  entry_date: string;
  period: "morning" | "evening";
  mood: string;
  note: string | null;
}

export interface Reflection {
  id: string;
  period_type: "weekly" | "monthly";
  period_start: string;
  content: string;
  created_at: string;
  updated_at: string;
}
