import {
  Navigate,
  Route,
  Routes,
} from 'react-router';

import DevelopmentPage from './components/common/DevelopmentPage';

import LoginPage from './pages/LoginPage/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import StudentDashboardPage from './pages/StudentDashboardPage/StudentDashboardPage';
import { useExamWebSocket } from './websocket/useExamWebSocket';

function App() {
  const {
    status,
    lastMessage,
    sendMessage,
  } = useExamWebSocket();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route
        path="/login"
        element={
          <LoginPage
            connectionStatus={status}
            lastMessage={lastMessage}
            sendMessage={sendMessage}
          />
        }
      />

      <Route
        path="/student/exams"
        element={<StudentDashboardPage/>}
      />

      <Route
        path="/student/exams/:examId"
        element={
          <DevelopmentPage
            eyebrow="EXAMINATION DETAILS"
            title="Examination information"
            description="This page will display the exam schedule, duration, instructions, and participation status."
            backTo="/student/exams"
            backLabel="Back to examinations"
          />
        }
      />

      <Route
        path="/student/exams/:examId/room"
        element={
          <DevelopmentPage
            eyebrow="EXAMINATION ROOM"
            title="Examination in progress"
            description="This page will contain the timer, questions, answer navigation, autosave status, and anti-cheating event collection."
            backTo="/student/exams"
            backLabel="Back to examinations"
          />
        }
      />

      <Route
        path="/student/exams/:examId/result"
        element={
          <DevelopmentPage
            eyebrow="EXAMINATION RESULT"
            title="Your result"
            description="This page will display the score and result after the lecturer releases them."
            backTo="/student/exams"
            backLabel="Back to examinations"
          />
        }
      />

      <Route
        path="/teacher"
        element={
          <DevelopmentPage
            eyebrow="LECTURER PORTAL"
            title="Lecturer dashboard"
            description="This page will provide access to exam creation, question management, assignments, and monitoring."
          />
        }
      />

      <Route
        path="/admin/students/new"
        element={
          <RegisterPage
            connectionStatus={status}
            lastMessage={lastMessage}
            sendMessage={sendMessage}
          />
        }
      />

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