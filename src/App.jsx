import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import History from './pages/History';
import PlayerStats from './pages/PlayerStats';
import GameStats from './pages/GameStats';
import Settings from './pages/Templates';
import ResourceTracker from './pages/ResourceTracker';
import CodeNames from './pages/CodeNames';
import DiceRollerPage from './pages/DiceRollerPage';
import TimerPage from './pages/TimerPage';
import RandomizerPage from './pages/RandomizerPage';
import StartingPlayerPage from './pages/StartingPlayerPage';

const AuthenticatedApp = () => {
  const { isLoadingAuth, authChecked } = useAuth();

  if (isLoadingAuth && !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/players" element={<PlayerStats />} />
          <Route path="/games" element={<GameStats />} />
          <Route path="/templates" element={<Settings />} />
          <Route path="/tools/resources" element={<ResourceTracker />} />
          <Route path="/tools/codenames" element={<CodeNames />} />
          <Route path="/tools/dice" element={<DiceRollerPage />} />
          <Route path="/tools/timer" element={<TimerPage />} />
          <Route path="/tools/randomizer" element={<RandomizerPage />} />
          <Route path="/tools/starting-player" element={<StartingPlayerPage />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>

          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App