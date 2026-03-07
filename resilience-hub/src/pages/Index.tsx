import Header from "@/components/dashboard/Header";
import StatsBar from "@/components/dashboard/StatsBar";
import DisasterMap from "@/components/dashboard/DisasterMap";
import AlertFeed from "@/components/dashboard/AlertFeed";
import DisasterList from "@/components/dashboard/DisasterList";
import DisasterDetail from "@/components/dashboard/DisasterDetail";
import { useDisasterData } from "@/hooks/useDisasterData";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const {
    disasters,
    alerts,
    selected,
    setSelected,
    selectById,
    stats,
    wsConnected,
    usgsLoading,
    alertsLoading,
    lastRefresh,
    refreshUSGS,
    refreshAlerts,
  } = useDisasterData();

  const { token } = useAuth();

  // If user is not logged in, show a message or redirect.
  // We'll just show a simple prompt
  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg">Please <a href="/login" className="text-primary underline">login</a> to access the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background grid-bg overflow-hidden">
      <Header
        wsConnected={wsConnected}
        usgsLoading={usgsLoading}
        alertsLoading={alertsLoading}
        lastRefresh={lastRefresh}
        onRefresh={refreshUSGS}
        onRefreshAlerts={refreshAlerts}
      />
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        <StatsBar stats={stats} />
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4 min-h-0">
          <div className="hidden lg:flex flex-col min-h-0">
            <DisasterList disasters={disasters} onSelect={setSelected} selectedId={selected?.id ?? null} />
          </div>
          <div className="relative min-h-[400px] lg:min-h-0">
            <DisasterMap disasters={disasters} onSelectDisaster={setSelected} selectedDisaster={selected} />
            <DisasterDetail disaster={selected} onClose={() => setSelected(null)} />
          </div>
          <div className="hidden lg:flex flex-col min-h-0">
            <AlertFeed alerts={alerts} onSelectDisaster={selectById} />
          </div>
        </div>
      </div>
    </div>
  );
}
