import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import AboutPage from "@/pages/AboutPage";
import LoginPage from "@/pages/LoginPage";
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import DashboardPage from "@/pages/DashboardPage";
import JournalPage from "@/pages/JournalPage";
import SettingsPage from "@/pages/SettingsPage";
import InviteAcceptPage from "@/pages/InviteAcceptPage";
import NotFoundPage from "@/pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/app" element={<DashboardPage activeView="home" />} />
      <Route path="/app/journals" element={<DashboardPage activeView="journal" />} />
      <Route path="/app/settings" element={<SettingsPage />} />
      <Route path="/app/journals/:id" element={<JournalPage />} />
      <Route path="/app/invite/:code" element={<InviteAcceptPage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
