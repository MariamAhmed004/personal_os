import {
  LuBot,
  LuCalendarDays,
  LuHeart,
  LuHouse,
  LuCircleHelp,
  LuEllipsis,
  LuLeaf,
  LuListTodo,
  LuMessageCircle,
  LuMoon,
  LuNotebookPen,
  LuPencil,
  LuPlus,
  LuSend,
  LuSettings,
  LuSparkles,
  LuSun,
  LuTrash2,
  LuClipboardList,
} from "react-icons/lu";
import type { IconType } from "react-icons";

export type IconName =
  | "home"
  | "today"
  | "calendar"
  | "habits"
  | "backlog"
  | "journal"
  | "settings"
  | "leaf"
  | "mood"
  | "chat"
  | "bot"
  | "send"
  | "moon"
  | "sun"
  | "sparkles"
  | "help"
  | "plus"
  | "edit"
  | "trash"
  | "more";

const icons: Record<IconName, IconType> = {
  home: LuHouse,
  today: LuClipboardList,
  calendar: LuCalendarDays,
  habits: LuHeart,
  backlog: LuListTodo,
  journal: LuNotebookPen,
  settings: LuSettings,
  leaf: LuLeaf,
  mood: LuHeart,
  chat: LuMessageCircle,
  bot: LuBot,
  send: LuSend,
  moon: LuMoon,
  sun: LuSun,
  sparkles: LuSparkles,
  help: LuCircleHelp,
  plus: LuPlus,
  edit: LuPencil,
  trash: LuTrash2,
  more: LuEllipsis,
};

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const IconComponent = icons[name];
  return <IconComponent className={className} aria-hidden="true" focusable="false" />;
}
