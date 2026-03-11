import { useEffect, useMemo, useState } from "react";
import {
  listCitizenUpdates,
  resolveCitizenImageUrl,
  reviewCitizenUpdate,
  submitCitizenUpdate,
  type CitizenUpdateItem,
} from "@/services/citizenUpdatesService";

type Props = {
  token: string | null;
  canReview: boolean;
};

export default function CitizenIntelPanel({ token, canReview }: Props) {
  const [updates, setUpdates] = useState<CitizenUpdateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const pendingCount = useMemo(
    () => updates.filter((u) => u.status === "submitted").length,
    [updates]
  );

  const load = async () => {
    try {
      setLoading(true);
      const rows = await listCitizenUpdates(40);
      setUpdates(rows);
    } catch (err: any) {
      setError(err.message || "Failed to load citizen updates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 12000);
    return () => clearInterval(timer);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      setSubmitLoading(true);
      await submitCitizenUpdate({
        title: title.trim(),
        description: description.trim(),
        category,
        latitude: Number(latitude),
        longitude: Number(longitude),
        reporter_name: reporterName.trim() || undefined,
        reporter_phone: reporterPhone.trim() || undefined,
        image: imageFile,
      });
      setSuccess("Citizen update submitted.");
      setTitle("");
      setDescription("");
      setCategory("other");
      setLatitude("");
      setLongitude("");
      setReporterName("");
      setReporterPhone("");
      setImageFile(null);
      await load();
    } catch (err: any) {
      setError(err.message || "Submit failed");
    } finally {
      setSubmitLoading(false);
    }
  };

  const onReview = async (id: number, status: "verified" | "rejected") => {
    if (!token) return;
    try {
      await reviewCitizenUpdate(token, id, status);
      await load();
    } catch (err: any) {
      setError(err.message || "Review failed");
    }
  };

  return (
    <section className="rounded-lg border border-cyan-500/40 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm uppercase tracking-wider font-semibold">Citizen Ground Updates</h3>
        <span className="text-xs text-muted-foreground">Pending: {pendingCount}</span>
      </div>

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
      {success && <p className="mb-2 text-xs text-green-400">{success}</p>}

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is happening?" className="h-9 rounded border border-border bg-background px-2 text-sm" required />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded border border-border bg-background px-2 text-sm">
          <option value="other">Other</option>
          <option value="flood">Flood</option>
          <option value="fire">Fire</option>
          <option value="medical">Medical</option>
          <option value="road_block">Road Block</option>
        </select>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" className="md:col-span-2 min-h-[70px] rounded border border-border bg-background px-2 py-1 text-sm" required />
        <input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude" type="number" step="any" className="h-9 rounded border border-border bg-background px-2 text-sm" required />
        <input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude" type="number" step="any" className="h-9 rounded border border-border bg-background px-2 text-sm" required />
        <input value={reporterName} onChange={(e) => setReporterName(e.target.value)} placeholder="Your name (optional)" className="h-9 rounded border border-border bg-background px-2 text-sm" />
        <input value={reporterPhone} onChange={(e) => setReporterPhone(e.target.value)} placeholder="Phone (optional)" className="h-9 rounded border border-border bg-background px-2 text-sm" />
        <input onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} type="file" accept="image/*" className="md:col-span-2 text-xs" />
        <button type="submit" disabled={submitLoading} className="md:col-span-2 h-9 rounded border border-cyan-500 text-cyan-300 text-sm font-mono hover:bg-cyan-500/10 disabled:opacity-60">
          {submitLoading ? "Submitting..." : "Submit Citizen Update"}
        </button>
      </form>

      <div className="space-y-2 max-h-72 overflow-auto">
        {loading && <p className="text-xs text-muted-foreground">Loading updates...</p>}
        {!loading && updates.length === 0 && <p className="text-xs text-muted-foreground">No citizen updates yet.</p>}
        {updates.map((u) => {
          const imageUrl = resolveCitizenImageUrl(u.image_url);
          return (
            <div key={u.id} className="rounded border border-border bg-background/40 p-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{u.title}</p>
                  <p className="text-xs text-muted-foreground">{u.category.toUpperCase()} • {new Date(u.created_at).toLocaleString()}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border ${u.status === "verified" ? "border-green-500 text-green-400" : u.status === "rejected" ? "border-red-500 text-red-400" : "border-amber-500 text-amber-300"}`}>
                  {u.status}
                </span>
              </div>
              <p className="text-sm mt-1">{u.description}</p>
              <p className="text-xs text-muted-foreground mt-1">Loc: {u.latitude.toFixed(4)}, {u.longitude.toFixed(4)}</p>
              {imageUrl && (
                <a href={imageUrl} target="_blank" rel="noreferrer">
                  <img src={imageUrl} alt="Citizen evidence" className="mt-2 h-28 w-full object-cover rounded border border-border" />
                </a>
              )}
              {canReview && u.status === "submitted" && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => onReview(u.id, "verified")} className="h-8 px-2 rounded border border-green-500 text-green-300 text-xs">Verify</button>
                  <button onClick={() => onReview(u.id, "rejected")} className="h-8 px-2 rounded border border-red-500 text-red-300 text-xs">Reject</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
