import { useEffect, useState } from "react";
import { CloudUpload, CloudOff, Check } from "lucide-react";
import { onSaveStatus, retrySaving } from "@/api/base44Client";

// Small header badge: "Saving…" while changes are on their way to the sheet, a warning if they're stuck,
// and a brief "Saved" when the queue empties.
export default function SaveStatus() {
  const [status, setStatus] = useState({ pending: 0, error: null });
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let prev = 0;
    let timer;
    const off = onSaveStatus((s) => {
      setStatus(s);
      if (prev > 0 && s.pending === 0 && !s.error) {
        setJustSaved(true);
        clearTimeout(timer);
        timer = setTimeout(() => setJustSaved(false), 1500);
      }
      prev = s.pending;
    });
    return () => { off(); clearTimeout(timer); };
  }, []);

  if (status.error) {
    return (
      <button
        type="button"
        onClick={() => retrySaving()}
        title={status.error}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/15 text-destructive"
      >
        <CloudOff className="w-3.5 h-3.5" />
        {status.pending ? "Not saved yet" : "Save failed"}
      </button>
    );
  }
  if (status.pending > 0) {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground bg-muted">
        <CloudUpload className="w-3.5 h-3.5 animate-pulse" />
        Saving…
      </span>
    );
  }
  if (justSaved) {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground">
        <Check className="w-3.5 h-3.5" />
        Saved
      </span>
    );
  }
  return null;
}
