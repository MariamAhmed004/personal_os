import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./Layout";
import { ProtectedRoute } from "./ProtectedRoute";
import { BacklogPage } from "../features/backlog/BacklogPage";
import { CalendarPage } from "../features/calendar/CalendarPage";
import { DailySheetPage } from "../features/daily-sheet/DailySheetPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { HabitsPage } from "../features/habits/HabitsPage";
import { JournalPage } from "../features/journal/JournalPage";
import { LoginPage } from "../features/auth/LoginPage";
import { SettingsPage } from "../features/settings/SettingsPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <Layout />,
      children: [
        { path: "/", element: <DashboardPage /> },
        { path: "/daily-sheet", element: <DailySheetPage /> },
        { path: "/calendar", element: <CalendarPage /> },
        { path: "/habits", element: <HabitsPage /> },
        { path: "/backlog", element: <BacklogPage /> },
        { path: "/journal", element: <JournalPage /> },
        { path: "/settings", element: <SettingsPage /> },
      ],
    }],
  },
]);
