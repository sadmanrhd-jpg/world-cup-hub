import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/Layout";
import TournamentFixtureSync from "./components/TournamentFixtureSync";
import Home from "./pages/Home";
import Groups from "./pages/Groups";
import Teams from "./pages/Teams";
import TeamPage from "./pages/TeamPage";
import Fixtures from "./pages/Fixtures";
import MatchPage from "./pages/MatchPage";
import Prediction from "./pages/Prediction";
import MiniGame from "./pages/MiniGame";
import Stadiums from "./pages/Stadiums";
import StadiumPage from "./pages/StadiumPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TournamentFixtureSync />
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
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
