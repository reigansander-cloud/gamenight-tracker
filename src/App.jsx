import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from './components/Layout';
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
  // Render the main app
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
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
      <QueryClientProvider client={queryClientInstance}>
        <Router>

          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
  )
}

export default App