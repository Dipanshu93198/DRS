import Header from "@/components/dashboard/Header";
import StatsBar from "@/components/dashboard/StatsBar";
import CommandCenter from "@/components/dashboard/CommandCenter";
import AssignmentBoard, { type Assignment } from "@/components/dashboard/AssignmentBoard";
import AuditTimeline, { type AuditEvent } from "@/components/dashboard/AuditTimeline";
import ResponseWorkbench from "@/components/dashboard/ResponseWorkbench";
import DisasterMap from "@/components/dashboard/DisasterMap";
import AlertFeed from "@/components/dashboard/AlertFeed";
import DisasterList from "@/components/dashboard/DisasterList";
import DisasterDetail from "@/components/dashboard/DisasterDetail";
import CitizenIntelPanel from "@/components/dashboard/CitizenIntelPanel";
import SMSAlertsPanel from "@/components/dashboard/SMSAlertsPanel";
import { useDisasterData } from "@/hooks/useDisasterData";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Disaster } from "@/data/mockDisasters";
import { getSessionMe, switchMissionRole, type MissionRole } from "@/services/authService";
import { createAuditEvent, listAssignments, listAuditEvents, upsertAssignment } from "@/services/operationsService";

type SeverityFilter = "all" | Disaster["severity"];
type StatusFilter = "all" | Disaster["status"];
type SourceFilter = "all" | "live" | "simulated";
type SortFilter = "latest" | "severity" | "affected";

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

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
    updateDisasterStatus,
  } = useDisasterData();

  const { token, profile, setMissionRole, login } = useAuth();

  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [sortBy, setSortBy] = useState<SortFilter>("latest");
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [operatorLocation, setOperatorLocation] = useState<{ lat: number; lng: number } | null>(null);
  const ruleCooldownRef = useRef<Record<string, number>>({});
  const [allowedMissionRoles, setAllowedMissionRoles] = useState<MissionRole[]>(["admin", "field", "analyst"]);

  const missionRole = profile.missionRole ?? "admin";
  const operatorName = profile.name || profile.email || "Operator";

  useEffect(() => {
    const saved = localStorage.getItem("drs_dashboard_filters_v1");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        query: string;
        severity: SeverityFilter;
        status: StatusFilter;
        source: SourceFilter;
        sortBy: SortFilter;
      };
      setQuery(parsed.query ?? "");
      setSeverity(parsed.severity ?? "all");
      setStatus(parsed.status ?? "all");
      setSource(parsed.source ?? "all");
      setSortBy(parsed.sortBy ?? "latest");
    } catch {
      // ignore invalid cache
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("drs_dashboard_filters_v1", JSON.stringify({ query, severity, status, source, sortBy }));
  }, [query, severity, status, source, sortBy]);

  useEffect(() => {
    if (!token) return;
    getSessionMe(token)
      .then((session) => {
        setAllowedMissionRoles(session.allowed_mission_roles);
        if (session.mission_role !== missionRole) {
          setMissionRole(session.mission_role);
        }
      })
      .catch(() => {
        setAllowedMissionRoles(["analyst"]);
      });
  }, [missionRole, setMissionRole, token]);

  useEffect(() => {
    const savedAssignments = localStorage.getItem("drs_assignments_v1");
    const savedAudit = localStorage.getItem("drs_audit_v1");

    if (savedAssignments) {
      try {
        setAssignments(JSON.parse(savedAssignments) as Record<string, Assignment>);
      } catch {
        setAssignments({});
      }
    }
    if (savedAudit) {
      try {
        setAuditEvents(JSON.parse(savedAudit) as AuditEvent[]);
      } catch {
        setAuditEvents([]);
      }
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    listAssignments(token)
      .then((rows) => {
        const map: Record<string, Assignment> = {};
        for (const row of rows) {
          map[row.disaster_key] = {
            disasterId: row.disaster_key,
            owner: row.owner,
            status: row.status as Assignment["status"],
            etaMinutes: row.eta_minutes,
            slaMinutes: row.sla_minutes,
            notes: row.notes ?? "",
            lastUpdated: row.last_updated,
          };
        }
        setAssignments((prev) => ({ ...prev, ...map }));
      })
      .catch(() => {});

    listAuditEvents(token)
      .then((events) => {
        const mapped: AuditEvent[] = events.map((e) => ({
          id: `audit-db-${e.id}`,
          actor: e.actor_name,
          action: e.action,
          target: e.target,
          severity: e.severity,
          timestamp: e.created_at,
          details: e.details ?? undefined,
        }));
        setAuditEvents((prev) => (mapped.length > 0 ? mapped : prev));
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      listAssignments(token)
        .then((rows) => {
          const map: Record<string, Assignment> = {};
          for (const row of rows) {
            map[row.disaster_key] = {
              disasterId: row.disaster_key,
              owner: row.owner,
              status: row.status as Assignment["status"],
              etaMinutes: row.eta_minutes,
              slaMinutes: row.sla_minutes,
              notes: row.notes ?? "",
              lastUpdated: row.last_updated,
            };
          }
          setAssignments((prev) => ({ ...prev, ...map }));
        })
        .catch(() => {});

      listAuditEvents(token)
        .then((events) => {
          const mapped: AuditEvent[] = events.map((e) => ({
            id: `audit-db-${e.id}`,
            actor: e.actor_name,
            action: e.action,
            target: e.target,
            severity: e.severity,
            timestamp: e.created_at,
            details: e.details ?? undefined,
          }));
          if (mapped.length > 0) {
            setAuditEvents(mapped);
          }
        })
        .catch(() => {});
    }, 8000);

    return () => clearInterval(timer);
  }, [token]);

  useEffect(() => {
    localStorage.setItem("drs_assignments_v1", JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem("drs_audit_v1", JSON.stringify(auditEvents.slice(0, 80)));
  }, [auditEvents]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setOperatorLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setOperatorLocation(null),
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
    );
  }, []);

  const filteredDisasters = useMemo(() => {
    const q = query.trim().toLowerCase();
    const severityRank: Record<Disaster["severity"], number> = {
      critical: 4,
      high: 3,
      moderate: 2,
      low: 1,
    };

    const filtered = disasters.filter((d) => {
      if (severity !== "all" && d.severity !== severity) return false;
      if (status !== "all" && d.status !== status) return false;
      if (source === "live" && !d.id.startsWith("usgs-")) return false;
      if (source === "simulated" && d.id.startsWith("usgs-")) return false;
      if (!q) return true;

      return (
        d.name.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q)
      );
    });

    if (sortBy === "latest") {
      return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    if (sortBy === "affected") {
      return filtered.sort((a, b) => b.affectedPopulation - a.affectedPopulation);
    }
    return filtered.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
  }, [disasters, query, severity, source, sortBy, status]);

  const resetFilters = () => {
    setQuery("");
    setSeverity("all");
    setStatus("all");
    setSource("all");
    setSortBy("latest");
  };

  const filteredAlerts = useMemo(() => {
    const visible = new Set(filteredDisasters.map((d) => d.id));
    return alerts.filter((a) => visible.has(a.disasterId) || a.disasterId.startsWith("external-"));
  }, [alerts, filteredDisasters]);

  const selectedForView = useMemo(() => {
    if (!selected) return null;
    return filteredDisasters.find((d) => d.id === selected.id) ?? selected;
  }, [filteredDisasters, selected]);

  useEffect(() => {
    setAssignments((prev) => {
      const next = { ...prev };
      for (const d of disasters) {
        if (!next[d.id]) {
          next[d.id] = {
            disasterId: d.id,
            owner: d.severity === "critical" ? "Rapid Response Team A" : "District Control",
            status: d.status === "resolved" ? "resolved" : "queued",
            etaMinutes: d.severity === "critical" ? 15 : 35,
            slaMinutes: d.severity === "critical" ? 60 : d.severity === "high" ? 90 : 120,
            notes: "",
            lastUpdated: new Date().toISOString(),
          };
        }
      }
      return next;
    });
  }, [disasters]);

  const addAudit = (event: Omit<AuditEvent, "id" | "timestamp">) => {
    const createdAt = new Date().toISOString();
    setAuditEvents((prev) => [
      {
        ...event,
        id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
        timestamp: createdAt,
      },
      ...prev,
    ]);

    if (token) {
      createAuditEvent(token, {
        action: event.action,
        target: event.target,
        severity: event.severity,
        details: event.details,
      }).catch(() => {});
    }
  };

  const onStatusChange = (id: string, nextStatus: Disaster["status"], nextSeverity?: Disaster["severity"]) => {
    updateDisasterStatus(id, nextStatus, nextSeverity);
    const disaster = disasters.find((d) => d.id === id);
    if (!disaster) return;
    addAudit({
      actor: operatorName,
      action: "Incident Status Updated",
      target: `${disaster.name} -> ${nextStatus.toUpperCase()}`,
      severity: nextSeverity === "critical" ? "critical" : "info",
      details: nextSeverity ? `Severity set to ${nextSeverity}` : undefined,
    });
  };

  const onAssignmentUpdate = (id: string, patch: Partial<Assignment>) => {
    let updated: Assignment | null = null;
    setAssignments((prev) => {
      updated = {
        ...(prev[id] ?? {
          disasterId: id,
          owner: "District Control",
          status: "queued",
          etaMinutes: 30,
          slaMinutes: 120,
          lastUpdated: new Date().toISOString(),
        }),
        ...patch,
        lastUpdated: new Date().toISOString(),
      };
      return {
        ...prev,
        [id]: updated!,
      };
    });

    const disaster = disasters.find((d) => d.id === id);
    addAudit({
      actor: operatorName,
      action: "Assignment Updated",
      target: disaster ? disaster.name : id,
      severity: "warning",
      details: Object.keys(patch).join(", "),
    });

    if (token && updated) {
      upsertAssignment(token, {
        disaster_key: id,
        owner: updated.owner,
        status: updated.status,
        eta_minutes: updated.etaMinutes,
        sla_minutes: updated.slaMinutes,
        notes: updated.notes,
      }).catch(() => {});
    }
  };

  const handleRoleChange = async (nextRole: MissionRole) => {
    if (!allowedMissionRoles.includes(nextRole)) return;
    if (!token) {
      setMissionRole(nextRole);
      return;
    }
    try {
      const switched = await switchMissionRole(token, nextRole);
      login(switched.access_token, { missionRole: switched.mission_role });
      setMissionRole(switched.mission_role);
      setAllowedMissionRoles(switched.allowed_mission_roles);
    } catch {
      // Keep previous role if backend denies switch
    }
  };

  useEffect(() => {
    const now = Date.now();

    for (const d of disasters) {
      if (d.status === "resolved") continue;

      const ageMinutes = Math.max(0, Math.floor((now - new Date(d.timestamp).getTime()) / 60000));
      const cooldownKey = `rule-${d.id}`;
      const lastFired = ruleCooldownRef.current[cooldownKey] ?? 0;
      const cooled = now - lastFired > 4 * 60 * 1000;

      if (operatorLocation) {
        const km = haversineDistanceKm(operatorLocation.lat, operatorLocation.lng, d.lat, d.lng);
        if (km <= 400 && (d.severity === "high" || d.severity === "critical") && cooled) {
          if (d.severity !== "critical") {
            updateDisasterStatus(d.id, "active", "critical");
          }
          addAudit({
            actor: "Rules Engine",
            action: "Geo-Fenced Escalation Triggered",
            target: `${d.name} (${km.toFixed(0)} km from operator)` ,
            severity: "critical",
            details: "Auto-priority due to proximity + severity",
          });
          ruleCooldownRef.current[cooldownKey] = now;
          continue;
        }
      }

      const assign = assignments[d.id];
      if (assign && ageMinutes > assign.slaMinutes && cooled) {
        addAudit({
          actor: "Rules Engine",
          action: "SLA Breach Detected",
          target: d.name,
          severity: "warning",
          details: `Age ${ageMinutes}m > SLA ${assign.slaMinutes}m`,
        });
        ruleCooldownRef.current[cooldownKey] = now;
      }
    }
  }, [assignments, disasters, operatorLocation, updateDisasterStatus]);

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
        missionRole={missionRole}
        onRoleChange={handleRoleChange}
        allowedMissionRoles={allowedMissionRoles}
      />

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto overflow-x-hidden">
        <StatsBar stats={stats} />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search event/location/type..."
            className="md:col-span-2 h-10 rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as SeverityFilter)}
            className="h-10 rounded-md border border-border bg-card px-3 text-sm"
          >
            <option value="all">All severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="h-10 rounded-md border border-border bg-card px-3 text-sm"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
          </select>
          <div className="flex gap-2">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as SourceFilter)}
              className="h-10 rounded-md border border-border bg-card px-3 text-sm flex-1"
            >
              <option value="all">All sources</option>
              <option value="live">USGS live</option>
              <option value="simulated">Simulated/mock</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortFilter)}
              className="h-10 rounded-md border border-border bg-card px-3 text-sm flex-1"
            >
              <option value="latest">Latest</option>
              <option value="severity">Severity</option>
              <option value="affected">Affected</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground -mt-2 flex items-center justify-between gap-3">
          <span>
          Showing {filteredDisasters.length} events and {filteredAlerts.length} alerts
          {operatorLocation ? ` • Operator geo-lock active (${operatorLocation.lat.toFixed(2)}, ${operatorLocation.lng.toFixed(2)})` : " • Operator geo-lock unavailable"}
          </span>
          {filteredDisasters.length === 0 && disasters.length > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded border border-cyan-500/60 px-2 py-1 text-[11px] font-mono text-cyan-300 hover:bg-cyan-500/10"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4 min-h-[460px]">
          <div className="hidden lg:flex flex-col min-h-0">
            <DisasterList disasters={filteredDisasters} onSelect={setSelected} selectedId={selectedForView?.id ?? null} />
          </div>
          <div className="relative min-h-[420px]">
            <DisasterMap disasters={filteredDisasters} onSelectDisaster={setSelected} selectedDisaster={selectedForView} />
            <DisasterDetail
              disaster={selectedForView}
              onClose={() => setSelected(null)}
              onStatusChange={onStatusChange}
            />
          </div>
          <div className="hidden lg:flex flex-col min-h-0">
            <AlertFeed alerts={filteredAlerts} onSelectDisaster={selectById} />
          </div>
        </div>

        <CitizenIntelPanel token={token} canReview={allowedMissionRoles.includes("admin")} />
        <SMSAlertsPanel token={token} canSend={missionRole === "admin" || missionRole === "field"} />

        {(missionRole === "admin" || missionRole === "analyst") && (
          <CommandCenter
            disasters={filteredDisasters}
            alerts={filteredAlerts}
            stats={stats}
            selected={selectedForView}
          />
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {(missionRole === "admin" || missionRole === "field") && (
            <AssignmentBoard
              role={missionRole}
              disasters={filteredDisasters}
              assignments={assignments}
              onUpdate={onAssignmentUpdate}
            />
          )}
          {(missionRole === "admin" || missionRole === "analyst") && (
            <AuditTimeline role={missionRole} events={auditEvents} />
          )}
        </div>

        <ResponseWorkbench selected={selectedForView} token={token} missionRole={missionRole} />

      </div>
    </div>
  );
}

