import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { RedirectIfAuthed } from "./auth/RedirectIfAuthed";
import { AuthLayout } from "./pages/AuthLayout";
import { LoginPage } from "./pages/LoginPage";
import { SignUpPage } from "./pages/SignUpPage";
import { AppShell } from "./entry/AppShell";
import { ProjectsIndex } from "./entry/ProjectsIndex";
import { ProjectPage } from "./entry/ProjectPage";
import { TaskPage } from "./entry/TaskPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<RedirectIfAuthed />}>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
            </Route>
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/projects" replace />} />
              <Route path="/projects" element={<ProjectsIndex />} />
              <Route path="/projects/:projectId" element={<ProjectPage />} />
              <Route
                path="/projects/:projectId/tasks/:taskId"
                element={<TaskPage />}
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
