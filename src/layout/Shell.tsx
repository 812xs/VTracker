import { useEffect, useState, type ReactNode } from "react";
import Header from "./header/Header";
import Sidebar from "./sidebar/Sidebar";
import Footer from "./footer/Footer";
import { loadNav, navLabel, saveNav, type NavId } from "./sidebar/nav";
import HomePage from "../pages/home/HomePage";
import MatchPage from "../pages/match/MatchPage";
import StatsPage from "../pages/stats/StatsPage";
import StorePage from "../pages/store/StorePage";
import PlayerPage from "../pages/player/PlayerPage";
import SettingsPage from "../pages/settings/SettingsPage";
import { useSnapshot } from "../shared/session/useSnapshot";
import "./shell.css";

interface Selection {
  matchId: string;
  puuid: string;
}

export default function Shell() {
  const [nav, setNav] = useState<NavId>(loadNav);
  const [selection, setSelection] = useState<Selection | null>(null);
  const session = useSnapshot();

  const snapshot = session.data;
  const match = snapshot?.match ?? null;

  // Seçim maç kimliğiyle birlikte tutulur; maç değişince düşer.
  const matchId = match?.id ?? null;
  useEffect(() => {
    if (selection && selection.matchId !== matchId) setSelection(null);
  }, [matchId, selection]);

  const go = (id: NavId) => {
    setNav(id);
    saveNav(id);
  };

  const selectPlayer = (puuid: string) => {
    if (!match) return;
    setSelection({ matchId: match.id, puuid });
    go("player");
  };

  const selected =
    selection && match ? (match.players.find((p) => p.puuid === selection.puuid) ?? null) : null;
  const self = match?.players.find((p) => p.isSelf) ?? snapshot?.me ?? null;
  const player = selected ?? self;

  let page: ReactNode;
  switch (nav) {
    case "match":
      page = (
        <MatchPage
          match={match}
          selectedPuuid={selected?.puuid ?? null}
          loading={session.loading}
          error={session.error}
          onSelect={selectPlayer}
          onRefresh={session.reload}
        />
      );
      break;
    case "stats":
      page = <StatsPage />;
      break;
    case "store":
      page = <StorePage />;
      break;
    case "player":
      page = (
        <PlayerPage
          player={player}
          loading={session.loading}
          error={session.error}
          onRefresh={session.reload}
        />
      );
      break;
    case "settings":
      page = <SettingsPage status={snapshot?.status ?? null} loading={session.loading} />;
      break;
    default:
      page = (
        <HomePage
          snapshot={snapshot}
          loading={session.loading}
          error={session.error}
          onRefresh={session.reload}
        />
      );
  }

  return (
    <div className="shell">
      <Sidebar active={nav} onSelect={go} />
      <Header title={navLabel(nav)} />
      <main className="shell__content">{page}</main>
      <Footer />
    </div>
  );
}
