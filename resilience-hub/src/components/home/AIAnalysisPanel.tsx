import { useEffect, useMemo, useRef } from "react";
import { animate, stagger } from "animejs";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LiveIncident } from "@/services/liveBoardService";

interface Props {
  incidents: LiveIncident[];
}

const severityWeight: Record<LiveIncident["severity"], number> = {
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

export default function AIAnalysisPanel({ incidents }: Props) {
  const meterRefs = useRef<Array<HTMLDivElement | null>>([]);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const recommendations = useMemo(() => {
    const ranked = [...incidents]
      .sort((a, b) => severityWeight[b.severity] * (b.affected_population || 1) - severityWeight[a.severity] * (a.affected_population || 1))
      .slice(0, 3);

    if (ranked.length === 0) {
      return [
        {
          id: "standby-1",
          title: "No critical events in queue",
          region: "Global standby",
          action: "Maintain satellite sweep, keep med-logistics warm, and monitor for signal escalation.",
          confidence: 74,
        },
        {
          id: "standby-2",
          title: "Resource staging maintained",
          region: "Command grid",
          action: "Preserve rapid deployment lanes and keep shelter inventory synchronized across regions.",
          confidence: 69,
        },
        {
          id: "standby-3",
          title: "Analysis fabric healthy",
          region: "Inference mesh",
          action: "Continue predictive scanning while validating telemetry freshness and route integrity.",
          confidence: 72,
        },
      ];
    }

    return ranked.map((incident, index) => ({
      id: incident.id,
      title: incident.title,
      region: `${incident.lat.toFixed(1)}, ${incident.lng.toFixed(1)}`,
      action:
        index === 0
          ? "Immediate multi-team dispatch with airborne recon"
          : index === 1
            ? "Shift logistics corridors and activate regional shelters"
            : "Stage med-evac support and satellite comms redundancy",
      confidence: Math.min(97, 68 + severityWeight[incident.severity] * 7 + index * 4),
    }));
  }, [incidents]);

  const forecastData = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const related = incidents[index];
        const pressure = related ? severityWeight[related.severity] * 16 : 12 + index * 4;
        return {
          hour: `T+${index * 4}h`,
          risk: pressure + 20 + (index % 2 === 0 ? 8 : 0),
          response: Math.max(18, 86 - index * 9),
        };
      }),
    [incidents],
  );

  const deploymentData = useMemo(
    () =>
      recommendations.map((item, index) => ({
        name: `Zone ${index + 1}`,
        score: item.confidence,
        color: index === 0 ? "#ff355e" : index === 1 ? "#f59e0b" : "#22d3ee",
      })),
    [recommendations],
  );

  useEffect(() => {
    if (chartRef.current) {
      animate(chartRef.current.querySelectorAll("[data-analysis-enter]"), {
        opacity: [0, 1],
        translateY: [18, 0],
        ease: "outExpo",
        delay: stagger(90),
        duration: 900,
      });
    }

    meterRefs.current.forEach((node, index) => {
      if (!node) return;
      animate(node, {
        width: `${recommendations[index]?.confidence ?? 0}%`,
        ease: "outQuart",
        duration: 1200,
        delay: 250 + index * 120,
      });
    });
  }, [recommendations]);

  return (
    <div ref={chartRef} className="grid gap-5">
      <div data-analysis-enter className="aegis-panel relative overflow-hidden rounded-[1.75rem] p-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-200/55">AI Risk Analysis</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Predicted impact escalation</h3>
          </div>
          <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.26em] text-cyan-100/60">
            Neural forecast
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.75} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(125,211,252,0.12)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: "#9bd6ea", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9bd6ea", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(2, 6, 23, 0.94)",
                  border: "1px solid rgba(34, 211, 238, 0.2)",
                  borderRadius: 14,
                  color: "#e0f2fe",
                }}
              />
              <Area type="monotone" dataKey="risk" stroke="#22d3ee" fill="url(#riskGradient)" strokeWidth={2.4} />
              <Area type="monotone" dataKey="response" stroke="#8b5cf6" fill="url(#responseGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="pointer-events-none absolute inset-0 scanline opacity-20" />
      </div>

      <div data-analysis-enter className="aegis-panel relative overflow-hidden rounded-[1.75rem] p-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-200/55">Resource Deployment</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Priority corridors</h3>
          </div>
          <div className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.26em] text-fuchsia-100/60">
            AI recommendations
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deploymentData} barGap={10}>
              <CartesianGrid stroke="rgba(125,211,252,0.12)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#9bd6ea", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9bd6ea", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(2, 6, 23, 0.94)",
                  border: "1px solid rgba(34, 211, 238, 0.2)",
                  borderRadius: 14,
                  color: "#e0f2fe",
                }}
              />
              <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                {deploymentData.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-5 space-y-4">
          {recommendations.map((item, index) => (
            <div key={`${item.id}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-100">{item.title}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/45">{item.region}</p>
                </div>
                <span className="font-mono text-xs text-cyan-100/55">{item.confidence}% confidence</span>
              </div>
              <p className="mt-3 text-sm text-slate-300/78">{item.action}</p>
              <div className="mt-3 h-1.5 rounded-full bg-slate-900/80">
                <div
                  ref={(node) => {
                    meterRefs.current[index] = node;
                  }}
                  className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.95),rgba(139,92,246,0.95),rgba(255,53,94,0.95))]"
                  style={{ width: 0 }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 scanline opacity-20" />
      </div>
    </div>
  );
}
