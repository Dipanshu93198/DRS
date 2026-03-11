import { useEffect, useState } from "react";
import { listSmsLogs, sendEvacuationSms, subscribeSmsAlerts } from "@/services/smsAlertsService";

type Props = {
  token: string | null;
  canSend: boolean;
};

export default function SMSAlertsPanel({ token, canSend }: Props) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [subLat, setSubLat] = useState("");
  const [subLng, setSubLng] = useState("");

  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentLat, setIncidentLat] = useState("");
  const [incidentLng, setIncidentLng] = useState("");
  const [radiusKm, setRadiusKm] = useState("8");
  const [maxRecipients, setMaxRecipients] = useState("200");

  const [logs, setLogs] = useState<any[]>([]);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadLogs = async () => {
    if (!token) return;
    try {
      const rows = await listSmsLogs(token, 40);
      setLogs(rows);
    } catch {
      // ignore log refresh errors
    }
  };

  useEffect(() => {
    loadLogs();
    const timer = setInterval(loadLogs, 15000);
    return () => clearInterval(timer);
  }, [token]);

  const onSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    try {
      setBusy(true);
      await subscribeSmsAlerts({
        phone,
        name: name || undefined,
        latitude: subLat ? Number(subLat) : undefined,
        longitude: subLng ? Number(subLng) : undefined,
        consent_sms: true,
      });
      setInfo("SMS alert subscription saved.");
      setPhone("");
      setName("");
    } catch (err: any) {
      setError(err.message || "Subscribe failed");
    } finally {
      setBusy(false);
    }
  };

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");
    setInfo("");
    try {
      setBusy(true);
      const data = await sendEvacuationSms(token, {
        incident_title: incidentTitle,
        incident_latitude: Number(incidentLat),
        incident_longitude: Number(incidentLng),
        impact_radius_km: Number(radiusKm),
        max_recipients: Number(maxRecipients),
      });
      setInfo(`Evacuation SMS dispatched. Sent=${data.sent}, Failed=${data.failed}`);
      await loadLogs();
    } catch (err: any) {
      setError(err.message || "Dispatch failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-cyan-500/40 bg-card p-4">
      <h3 className="text-sm uppercase tracking-wider font-semibold mb-3">Evacuation SMS</h3>
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
      {info && <p className="text-xs text-green-400 mb-2">{info}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <form onSubmit={onSubscribe} className="rounded border border-border p-3 space-y-2">
          <p className="text-xs font-mono text-cyan-300">Citizen SMS Opt-In</p>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (+91...)" className="h-9 w-full rounded border border-border bg-background px-2 text-sm" required />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className="h-9 w-full rounded border border-border bg-background px-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={subLat} onChange={(e) => setSubLat(e.target.value)} placeholder="Latitude" type="number" step="any" className="h-9 rounded border border-border bg-background px-2 text-sm" />
            <input value={subLng} onChange={(e) => setSubLng(e.target.value)} placeholder="Longitude" type="number" step="any" className="h-9 rounded border border-border bg-background px-2 text-sm" />
          </div>
          <button type="submit" disabled={busy} className="h-9 px-3 rounded border border-cyan-500 text-cyan-300 text-sm">Save Subscription</button>
        </form>

        <form onSubmit={onSend} className="rounded border border-border p-3 space-y-2">
          <p className="text-xs font-mono text-cyan-300">Admin Evacuation Broadcast</p>
          <input value={incidentTitle} onChange={(e) => setIncidentTitle(e.target.value)} placeholder="Incident title" className="h-9 w-full rounded border border-border bg-background px-2 text-sm" required disabled={!canSend} />
          <div className="grid grid-cols-2 gap-2">
            <input value={incidentLat} onChange={(e) => setIncidentLat(e.target.value)} placeholder="Incident latitude" type="number" step="any" className="h-9 rounded border border-border bg-background px-2 text-sm" required disabled={!canSend} />
            <input value={incidentLng} onChange={(e) => setIncidentLng(e.target.value)} placeholder="Incident longitude" type="number" step="any" className="h-9 rounded border border-border bg-background px-2 text-sm" required disabled={!canSend} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} placeholder="Impact radius (km)" type="number" step="0.1" className="h-9 rounded border border-border bg-background px-2 text-sm" required disabled={!canSend} />
            <input value={maxRecipients} onChange={(e) => setMaxRecipients(e.target.value)} placeholder="Max recipients" type="number" className="h-9 rounded border border-border bg-background px-2 text-sm" required disabled={!canSend} />
          </div>
          <button type="submit" disabled={busy || !canSend} className="h-9 px-3 rounded border border-amber-500 text-amber-300 text-sm">
            {canSend ? "Send Evacuation SMS" : "Role cannot send"}
          </button>
        </form>
      </div>

      <div className="mt-3 rounded border border-border p-3 max-h-52 overflow-auto">
        <p className="text-xs font-mono text-cyan-300 mb-2">SMS Dispatch Log</p>
        {logs.length === 0 && <p className="text-xs text-muted-foreground">No SMS logs yet.</p>}
        {logs.map((row) => (
          <div key={row.id} className="text-xs border-b border-border/60 py-1">
            <span className="font-semibold">{row.incident_title}</span> {"->"} {row.recipient_phone} [{row.status}]
            {row.error ? ` (${row.error})` : ""}
          </div>
        ))}
      </div>
    </section>
  );
}
