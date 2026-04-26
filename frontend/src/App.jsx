import { Routes, Route, Navigate } from 'react-router-dom';
import { NavProvider } from './lib/navContext.jsx';
import { AuthProvider, useAuth } from './lib/authContext.jsx';
import { ImportToastProvider } from './lib/importToastContext.jsx';
import { TestModeProvider } from './lib/testModeContext.jsx';
import { LayoutProvider } from './lib/layoutContext.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import InstanceQueue from './pages/InstanceQueue.jsx';
import GlobalQueue from './pages/GlobalQueue.jsx';
import AllDownloadClients from './pages/AllDownloadClients.jsx';
import SabnzbdQueue from './pages/SabnzbdQueue.jsx';
import QbittorrentQueue from './pages/QbittorrentQueue.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';

function AppContent() {
  const { auth } = useAuth();

  // Still loading auth status
  if (!auth) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg)',
      }}>
        <div style={{
          width: 32, height: 32, border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)', borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  // No users exist or not authenticated → show login/setup
  if (!auth.authenticated) {
    return <Login />;
  }

  // Authenticated → show app
  return (
    <LayoutProvider>
    <TestModeProvider>
    <ImportToastProvider>
    <NavProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/instance/:id" element={<InstanceQueue />} />
          <Route path="/activity" element={<GlobalQueue />} />
          <Route path="/download-clients" element={<AllDownloadClients />} />
          <Route path="/sabnzbd/:id" element={<SabnzbdQueue />} />
          <Route path="/qbittorrent/:id" element={<QbittorrentQueue />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </NavProvider>
    </ImportToastProvider>
    </TestModeProvider>
    </LayoutProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
