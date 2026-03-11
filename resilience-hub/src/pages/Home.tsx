import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { animate } from "animejs";
import { gsap } from "gsap";
import { Activity, AlertTriangle, LogIn, Shield, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { fetchGovernmentIncidents } from "@/services/govFeedsService";
import { fetchLiveBoard, type LiveIncident } from "@/services/liveBoardService";
import { fetchUSGSEarthquakes } from "@/services/usgsService";

const HolographicEarth = lazy(() => import("@/components/home/HolographicEarth"));
const LiveIncidentMap = lazy(() => import("@/components/home/LiveIncidentMap"));
const AIAnalysisPanel = lazy(() => import("@/components/home/AIAnalysisPanel"));
const UIParticleField = lazy(() => import("@/components/home/UIParticleField"));

function mapUsgsTypeToLive(type: string): string {
  if (type === "earthquake") return "earthquake";
  if (type === "tsunami") return "tsunami";
  if (type === "wildfire") return "wildfire";
  if (type === "flood") return "flood";
  return "other";
}

function severityIndex(severity: LiveIncident["severity"]) {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "moderate") return 2;
  return 1;
}

function mergeIncidents(sources: LiveIncident[]) {
  const deduped = new Map<string, LiveIncident>();

  sources.forEach((item) => {
    const key = `${item.source}:${item.id}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, item);
      return;
    }

    deduped.set(
      key,
      existing.affected_population >= item.affected_population ? existing : item,
    );
  });

  return [...deduped.values()]
    .sort((a, b) => {
      const severityDelta = severityIndex(b.severity) - severityIndex(a.severity);
      if (severityDelta !== 0) return severityDelta;
      return b.affected_population - a.affected_population;
    })
    .slice(0, 90);
}

function StatCard({
  label,
  value,
  detail,
  accent,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  accent: string;
  icon: ReactNode;
}) {
  const valueRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!valueRef.current) return;
    const target = { value: 0 };
    animate(target, {
      value,
      duration: 1400,
      ease: "outExpo",
      onUpdate: () => {
        if (!valueRef.current) return;
        valueRef.current.textContent = Intl.NumberFormat().format(Math.round(target.value));
      },
    });
  }, [value]);

  return (
    <div data-cinematic className="aegis-panel group relative overflow-hidden rounded-[1.6rem] p-5 transition-transform duration-300 hover:-translate-y-1">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ background: `radial-gradient(circle at top right, ${accent}, transparent 55%)` }}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-cyan-100/55">{label}</p>
          <p ref={valueRef} className="mt-3 text-4xl font-semibold text-white">
            0
          </p>
          <p className="mt-2 text-sm text-slate-300/70">{detail}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-cyan-200/80 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
          {icon}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 scanline opacity-20" />
    </div>
  );
}

function PanelFallback({ className = "" }: { className?: string }) {
  return (
    <div className={`aegis-panel relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_42%)]" />
      <div className="absolute inset-0 scanline opacity-15" />
    </div>
  );
}

function BackgroundFallback() {
  return <div className="pointer-events-none absolute inset-0 opacity-0" aria-hidden="true" />;
}

export default function Home() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const [now, setNow] = useState(new Date());
  const [zooming, setZooming] = useState(false);
  const [incidents, setIncidents] = useState<LiveIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [feedStatus, setFeedStatus] = useState({ command: false, seismic: false, government: false });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void import("@/components/home/LiveIncidentMap");

    const preload = () => {
      void import("@/components/home/HolographicEarth");
      void import("@/components/home/AIAnalysisPanel");
      void import("@/components/home/UIParticleField");
    };

    const browserWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (browserWindow.requestIdleCallback) {
      const id = browserWindow.requestIdleCallback(preload, { timeout: 1200 });
      return () => browserWindow.cancelIdleCallback?.(id);
    }

    const timeout = window.setTimeout(preload, 600);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLiveData() {
      try {
        setLoadError(null);

        const [boardResult, usgsResult, govResult] = await Promise.allSettled([
          fetchLiveBoard(70),
          fetchUSGSEarthquakes(),
          fetchGovernmentIncidents(25),
        ]);

        const fromDb = boardResult.status === "fulfilled" ? boardResult.value.incidents : [];
        const fromUsgs: LiveIncident[] =
          usgsResult.status === "fulfilled"
            ? usgsResult.value.slice(0, 20).map((q) => ({
                id: q.id,
                type: mapUsgsTypeToLive(q.type),
                title: q.name,
                lat: q.lat,
                lng: q.lng,
                severity: q.severity,
                status: q.status,
                affected_population: q.affectedPopulation,
                timestamp: q.timestamp,
                source: "usgs",
              }))
            : [];

        const fromGovFeeds: LiveIncident[] = govResult.status === "fulfilled" ? govResult.value.incidents.slice(0, 25) : [];

        const merged = mergeIncidents(
          [...fromDb, ...fromUsgs, ...fromGovFeeds].filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng)),
        );

        if (!cancelled) {
          setIncidents(merged);
          setLastSync(new Date().toISOString());
          setLoading(false);
          setFeedStatus({
            command: boardResult.status === "fulfilled",
            seismic: usgsResult.status === "fulfilled",
            government: govResult.status === "fulfilled",
          });
          if (boardResult.status === "rejected" && usgsResult.status === "rejected" && govResult.status === "rejected") {
            setLoadError("Live feeds unavailable. Check backend or internet connectivity.");
          }
        }
      } catch {
        if (!cancelled) {
          setLoadError("Failed to load live data.");
          setLoading(false);
        }
      }
    }

    loadLiveData();
    const poll = window.setInterval(loadLiveData, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      if (reducedMotion) return;
      gsap.fromTo("[data-cinematic]", { y: 28, opacity: 0, filter: "blur(8px)" }, {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 1,
        stagger: 0.08,
        ease: "power3.out",
      });
    }, rootRef);

    return () => ctx.revert();
  }, [incidents.length, reducedMotion]);

  useEffect(() => {
    const root = rootRef.current;
    const cursor = cursorRef.current;
    if (!root || !cursor || reducedMotion) return;

    const handleMove = (event: MouseEvent) => {
      const bounds = root.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      root.style.setProperty("--pointer-x", `${x}`);
      root.style.setProperty("--pointer-y", `${y}`);
      cursor.style.transform = `translate(${event.clientX - 140}px, ${event.clientY - 140}px)`;
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [reducedMotion]);

  const stats = useMemo(() => {
    const active = incidents.filter((i) => i.status !== "resolved").length;
    const critical = incidents.filter((i) => i.severity === "critical").length;
    const affected = incidents.reduce((sum, i) => sum + i.affected_population, 0);
    const deployed = Math.max(12, Math.round(active * 1.9 + critical * 2.8));
    return { active, critical, affected, deployed };
  }, [incidents]);

  const alertFeed = useMemo(
    () =>
      [...incidents]
        .sort((a, b) => severityIndex(b.severity) - severityIndex(a.severity))
        .slice(0, 5),
    [incidents],
  );

  const feedSummary = useMemo(
    () => [
      { label: "Command", online: feedStatus.command },
      { label: "USGS", online: feedStatus.seismic },
      { label: "Gov", online: feedStatus.government },
    ],
    [feedStatus],
  );

  const goToMap = () => {
    document.getElementById("incident-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goLiveBoard = () => {
    if (!token) {
      navigate("/login");
      return;
    }
    setZooming(true);
    window.setTimeout(() => navigate("/dashboard"), 650);
  };

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-hidden bg-[#030816] text-slate-100"
      style={{ ["--pointer-x" as string]: "0.5", ["--pointer-y" as string]: "0.5" }}
    >
      <Suspense fallback={<BackgroundFallback />}>
        <UIParticleField />
      </Suspense>
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.16),transparent_26%),radial-gradient(circle_at_50%_80%,rgba(14,165,233,0.14),transparent_35%),linear-gradient(180deg,#040817_0%,#030614_48%,#02040b_100%)]" />
      <div className="pointer-events-none absolute inset-0 scanline opacity-25" />
      {!reducedMotion && <div ref={cursorRef} className="pointer-events-none absolute h-72 w-72 rounded-full bg-cyan-400/12 blur-3xl" />}

      <header className="relative z-10 border-b border-cyan-400/10">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-6 lg:px-10">
          <div data-cinematic className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
              <Shield className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <p className="font-mono text-sm uppercase tracking-[0.45em] text-white">AEGIS Command</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.34em] text-cyan-200/55">AI disaster response system</p>
            </div>
          </div>

          <div data-cinematic className="hidden items-center gap-6 lg:flex">
            <div className="rounded-full border border-cyan-300/15 bg-white/[0.03] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.32em] text-cyan-100/55">
              Orbital watch online
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-100/55">{now.toUTCString().replace("GMT", "UTC")}</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1500px] px-6 pb-16 pt-10 lg:px-10 lg:pt-14">
        <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div data-cinematic className="inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.36em] text-cyan-100/70">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.95)]" />
              System operational
            </div>

            <div data-cinematic className="max-w-3xl space-y-5">
              <h1 className="aegis-title max-w-4xl text-6xl font-black uppercase leading-[0.86] md:text-8xl">
                <span>AI Powered</span>
                <span className="aegis-title-accent">Disaster Response</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300/78 md:text-xl">
                Real-time AI command system monitoring global disasters, predicting cascading impact zones, and orchestrating response logistics across the planet.
              </p>
            </div>

            <div data-cinematic className="flex flex-wrap gap-4">
              <Link to="/login" className="aegis-button-primary">
                <LogIn className="h-4 w-4" />
                <span>LOGIN TO COMMAND</span>
              </Link>
              <button onClick={goToMap} className="aegis-button-secondary" type="button">
                <span>VIEW LIVE INCIDENT MAP</span>
              </button>
              <button onClick={goLiveBoard} className="aegis-button-secondary" type="button">
                <span>OPEN RESPONSE BOARD</span>
              </button>
            </div>

            <div data-cinematic className="aegis-panel relative grid gap-4 rounded-[1.8rem] p-5 md:grid-cols-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-cyan-100/50">AI Mode</p>
                <p className="mt-3 text-xl font-semibold text-white">Autonomous triage active</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-cyan-100/50">Feeds</p>
                <p className="mt-3 text-sm text-slate-300/70">{loading ? "Synchronizing disaster telemetry" : loadError ?? `${incidents.length} live signals fused`}</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-cyan-100/50">Last sync</p>
                <p className="mt-3 text-sm text-slate-300/70">{lastSync ?? "Awaiting handshake"}</p>
              </div>
              <div className="md:col-span-3 flex flex-wrap gap-2 pt-2">
                {feedSummary.map((feed) => (
                  <span
                    key={feed.label}
                    className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.28em] ${
                      feed.online
                        ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100/70"
                        : "border-amber-400/25 bg-amber-400/10 text-amber-200/75"
                    }`}
                  >
                    {feed.label} {feed.online ? "linked" : "degraded"}
                  </span>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-0 scanline opacity-20" />
            </div>
          </div>

          <div data-cinematic className="relative">
            <div className="pointer-events-none absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_48%)] blur-3xl" />
            <Suspense fallback={<PanelFallback className="h-[540px] w-full rounded-[2rem]" />}>
              <HolographicEarth incidents={incidents} zooming={zooming} />
            </Suspense>
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active Incidents"
            value={stats.active}
            detail="Open incidents under active AI monitoring"
            accent="rgba(34, 211, 238, 0.32)"
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <StatCard
            label="Critical Alerts"
            value={stats.critical}
            detail="Priority level red escalation windows"
            accent="rgba(255, 53, 94, 0.34)"
            icon={<Activity className="h-5 w-5" />}
          />
          <StatCard
            label="People Affected"
            value={stats.affected}
            detail="Estimated population exposure across live zones"
            accent="rgba(14, 165, 233, 0.34)"
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Rescue Teams Deployed"
            value={stats.deployed}
            detail="Multi-region response units assigned by AI"
            accent="rgba(168, 85, 247, 0.3)"
            icon={<Shield className="h-5 w-5" />}
          />
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div id="incident-map" data-cinematic>
            <Suspense fallback={<PanelFallback className="min-h-[420px] rounded-[1.75rem]" />}>
              <LiveIncidentMap incidents={incidents} />
            </Suspense>
          </div>

          <div className="grid gap-6">
            <div data-cinematic>
              <Suspense fallback={<PanelFallback className="min-h-[760px] rounded-[1.75rem]" />}>
                <AIAnalysisPanel incidents={incidents} />
              </Suspense>
            </div>

            <div data-cinematic className="aegis-panel relative overflow-hidden rounded-[1.75rem] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-200/55">Signal Stream</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Live alert cascade</h3>
                </div>
                <div className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/55">
                  Real-time
                </div>
              </div>
              <div className="space-y-3">
                {alertFeed.length > 0 ? alertFeed.map((incident) => (
                  <div key={`${incident.source}-${incident.id}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{incident.title}</p>
                      <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-100/50">{incident.severity}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-300/70">
                      <span>{incident.status}</span>
                      <span className="h-1 w-1 rounded-full bg-cyan-200/40" />
                      <span>{Intl.NumberFormat().format(incident.affected_population)} affected</span>
                      <span className="h-1 w-1 rounded-full bg-cyan-200/40" />
                      <span>{incident.source}</span>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-sm text-slate-300/75">
                    No active alert stream yet. Once telemetry arrives, this panel will surface the highest-priority incidents first.
                  </div>
                )}
              </div>
              <div className="pointer-events-none absolute inset-0 scanline opacity-20" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
