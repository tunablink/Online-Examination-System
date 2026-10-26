import { Route, Routes } from "react-router";

import DevelopmentPage from "./components/common/DevelopmentPage";

import LoginPage from "./pages/LoginPage/LoginPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import StudentDashboardPage from "./pages/StudentDashboardPage/StudentDashboardPage";
import { useExamWebSocket } from "./websocket/useExamWebSocket";
import ExamDetailPage from "./pages/ExamDetailPage/ExamDetailPage";
import ExamRoomPage from "./pages/ExamRoomPage/ExamRoomPage";
import ExamHistoryPage from "./pages/ExamHistoryPage/ExamHistoryPage";
import ExamResultPage from "./pages/ExamResultPage/ExamResultPage";
import TeacherDashboardPage from "./pages/TeacherDashboardPage/TeacherDashboardPage";
import ExamManagementPage from "./pages/ExamManagementPage/ExamManagementPage";
import TeacherPortalLayout from "./components/layout/TeacherPortalLayout";
import ExamMonitoringPage from "./pages/ExamMonitoringPage/ExamMonitoringPage";
import SuspiciousActivityPage from "./pages/SuspiciousActivityPage/SuspiciousActivityPage";
import CreateExamPage from "./pages/CreateExamPage/CreateExamPage";
import QuestionManagementPage from "./pages/QuestionManagementPage/QuestionManagementPage";
import ExamOverviewPage from "./pages/ExamOverviewPage/ExamOverviewPage";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import HomeRedirect from "./components/routing/HomeRedirect";

function App() {
  const { status, sendMessage } = useExamWebSocket();

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route
        path="/login"
        element={
          <LoginPage connectionStatus={status} sendMessage={sendMessage} />
        }
      />

      <Route element={<ProtectedRoute allowedRoles={["STUDENT"]} />}>
        <Route path="/student/exams" element={<StudentDashboardPage />} />

        <Route path="/student/history" element={<ExamHistoryPage />} />

        <Route path="/student/exams/:examId" element={<ExamDetailPage />} />

        <Route
          path="/student/exams/:examId/room"
          element={<ExamRoomPage connectionStatus={status} />}
        />

        <Route
          path="/student/exams/:examId/result"
          element={<ExamResultPage />}
        />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["TEACHER"]} />}>
        <Route
          path="/teacher"
          element={<TeacherPortalLayout connectionStatus={status} />}
        >
          <Route index element={<TeacherDashboardPage connectionStatus={status} sendMessage={sendMessage} />} />

          <Route path="exams" element={<ExamManagementPage connectionStatus={status} sendMessage={sendMessage} />} />

          <Route path="exams/new" element={<CreateExamPage connectionStatus={status} sendMessage={sendMessage} />} />

          <Route
            path="exams/:examId/questions"
            element={<QuestionManagementPage connectionStatus={status} sendMessage={sendMessage} />}
          />

          <Route path="exams/:examId" element={<ExamOverviewPage connectionStatus={status} sendMessage={sendMessage} />} />

          <Route path="monitoring" element={<ExamMonitoringPage connectionStatus={status} sendMessage={sendMessage} />} />

          <Route path="monitoring/:examId" element={<ExamMonitoringPage connectionStatus={status} sendMessage={sendMessage} />} />

          <Route path="activities" element={<SuspiciousActivityPage />} />
        </Route>

        <Route
          path="/admin/students/new"
          element={
            <RegisterPage connectionStatus={status} sendMessage={sendMessage} />
          }
        />
      </Route>
      <Route
        path="*"
        element={
          <DevelopmentPage
            eyebrow="404"
            title="Page not found"
            description="The requested page does not exist in the examination system."
          />
        }
      />
    </Routes>
  );
}

export default App;
