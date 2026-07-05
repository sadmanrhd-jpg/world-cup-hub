import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import FloatingPenaltyChallenge from "./components/FloatingPenaltyChallenge";
import Layout from "./components/Layout";
import TournamentFixtureSync from "./components/TournamentFixtureSync";
import BestXI from "./pages/BestXI";
import Fixtures from "./pages/Fixtures";
import Groups from "./pages/Groups";
import Home from "./pages/Home";
import MatchPage from "./pages/MatchPage";
import MiniGame from "./pages/MiniGame";
import NotFound from "./pages/NotFound";
import Prediction from "./pages/Prediction";
import Profile from "./pages/Profile";
import StadiumPage from "./pages/StadiumPage";
import Stadiums from "./pages/Stadiums";
import TeamPage from "./pages/TeamPage";
import Teams from "./pages/Teams";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TournamentFixtureSync />
          <FloatingPenaltyChallenge />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/table" element={<Navigate to="/groups" replace />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/:slug" element={<TeamPage />} />
              <Route path="/fixtures" element={<Fixtures />} />
              <Route path="/matches/:fixtureId" element={<MatchPage />} />
              <Route path="/stadiums" element={<Stadiums />} />
              <Route path="/stadiums/:id" element={<StadiumPage />} />
              <Route path="/prediction" element={<Prediction />} />
              <Route path="/mini-game" element={<MiniGame />} />
              <Route path="/best-xi" element={<BestXI />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
