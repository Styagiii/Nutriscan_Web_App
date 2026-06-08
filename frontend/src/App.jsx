import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ScanPage from './pages/ScanPage';
import DashboardPage from './pages/DashboardPage';
import DiaryPage from './pages/DiaryPage';
import BarcodePage from './pages/BarcodePage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import LabScannerPage from './pages/LabScannerPage';
import ScanChooserPage from './pages/ScanChooserPage';

export default function App() {
  return (
    <Routes>
      {/* Full-screen lab scanner (no nav bars) */}
      <Route path="/lab-scan" element={<LabScannerPage />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/scan-choose" element={<ScanChooserPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/diary" element={<DiaryPage />} />
        <Route path="/barcode" element={<BarcodePage />} />
      </Route>
    </Routes>
  );
}
