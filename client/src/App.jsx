import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import TournamentsPage from './pages/TournamentsPage.jsx';
import TournamentPage from './pages/TournamentPage.jsx';
import TournamentFormPage from './pages/TournamentFormPage.jsx';
import MyPage from './pages/MyPage.jsx';
import TrainingPage from './pages/TrainingPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import AssistantPage from './pages/AssistantPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const STAFF = ['organizer', 'admin'];

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="tournaments" element={<TournamentsPage />} />
        <Route path="tournaments/new" element={<ProtectedRoute roles={STAFF}><TournamentFormPage /></ProtectedRoute>} />
        <Route path="tournaments/:id" element={<TournamentPage />} />
        <Route path="tournaments/:id/edit" element={<ProtectedRoute roles={STAFF}><TournamentFormPage /></ProtectedRoute>} />
        <Route path="my" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
        <Route path="training" element={<ProtectedRoute><TrainingPage /></ProtectedRoute>} />
        <Route path="assistant" element={<ProtectedRoute><AssistantPage /></ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
