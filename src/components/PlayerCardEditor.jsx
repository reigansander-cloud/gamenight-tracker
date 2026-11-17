import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Upload, X, ImagePlus, Palette, Download } from "lucide-react";
import { GOLD, isGold, goldFillStyle, goldRingStyle } from "@/lib/playerColor";

const isImageAvatar = (v) => typeof v === "string" && /^https?:\/\//.test(v);

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#64748b", "#334155",
];

export default function PlayerCardEditor({ current, color, bg, onAvatarChange, onColorChange, onBgChange }) {
  const [open, setOpen] = useState(false);
  const [draftColor, setDraftColor] = useState(/^#/.test(color) ? color : "");
  const [uploading, setUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileRef = useRef(null);
  const avatarFileRef = useRef(null);

  const openIcons = () => {
    const hex = color || draftColor || "#6366f1";
    navigator.clipboard?.writeText(hex).catch(() => {});
    window.open("https://game-icons.net/", "_blank", "noopener,noreferrer");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onAvatarChange(file_url);
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const applyColor = (c) => {
    setDraftColor(c);
    onColorChange(c || null);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onBgChange(file_url);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Saves the stored background file itself — the original full-resolution image.
  const handleDownload = async () => {
    if (!bg) return;
    setDownloading(true);
    try {
      const res = await fetch(bg);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `live-score-background.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(bg, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl hover:ring-2 hover:ring-primary transition-all overflow-hidden ${isGold(color) ? "" : "bg-muted"}`}
          style={isGold(color) ? goldRingStyle : color ? { border: `2px solid ${color}` } : undefined}
        >
          {isImageAvatar(current) ? (
            <img src={current} alt="avatar" className="w-full h-full object-contain p-[3px]" />
          ) : (
            current || "👤"
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Customize Player</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="avatar" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="avatar">Avatar</TabsTrigger>
            <TabsTrigger value="color">Color</TabsTrigger>
          </TabsList>

          <TabsContent value="avatar" className="mt-3 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                {isImageAvatar(current) ? (
                  <img src={current} alt="avatar" className="w-full h-full object-contain p-[5px]" />
                ) : (
                  <span className="text-3xl">{current || "👤"}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Input
                  value={isImageAvatar(current) ? "" : current || ""}
                  onChange={(e) => {
                    const grapheme = Array.from(e.target.value).pop() || "";
                    onAvatarChange(grapheme);
                  }}
                  placeholder="Type a letter or emoji"
                  className="text-center text-lg"
                  maxLength={2}
                />
                <p className="text-[11px] text-muted-foreground text-center mt-1">One character or emoji</p>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Custom Avatar Image</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={avatarUploading}
                  className="h-9 px-3 rounded-md bg-muted hover:bg-border text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" /> {avatarUploading ? "Uploading…" : "Upload image"}
                </button>
                <button
                  type="button"
                  onClick={openIcons}
                  className="h-9 px-3 rounded-md bg-muted hover:bg-border text-xs font-medium flex items-center gap-1.5"
                  title="Open game-icons.net and copy your color"
                >
                  <Palette className="w-3.5 h-3.5" /> {copied ? "Copied!" : "Icons"}
                </button>
                {isImageAvatar(current) && (
                  <button
                    type="button"
                    onClick={() => onAvatarChange("")}
                    className="h-9 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>
              <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
            </div>
          </TabsContent>

          <TabsContent value="color" className="mt-3 space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Player Color</p>
              <div className="grid grid-cols-6 gap-2">
                <button
                  onClick={() => applyColor(GOLD)}
                  title="Metallic gold"
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${isGold(color) ? "ring-2 ring-offset-1 ring-primary" : ""}`}
                  style={goldFillStyle}
                />
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => applyColor(c)}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${color === c ? "ring-2 ring-offset-1 ring-primary" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="color"
                  value={draftColor || "#6366f1"}
                  onChange={(e) => setDraftColor(e.target.value)}
                  className="w-9 h-9 rounded-md cursor-pointer border border-border bg-transparent p-0"
                />
                <input
                  value={draftColor}
                  onChange={(e) => setDraftColor(e.target.value)}
                  placeholder="#6366f1"
                  className="flex-1 h-9 min-w-0 rounded-md border border-input bg-transparent px-2 text-sm"
                />
                <button
                  onClick={() => applyColor(draftColor)}
                  className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium"
                >
                  Set
                </button>
              </div>
              {isGold(color) && <p className="text-xs text-muted-foreground mt-2">Metallic gold selected</p>}
              {color && (
                <button onClick={() => applyColor("")} className="text-xs text-muted-foreground hover:text-foreground mt-2">
                  Clear color
                </button>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Live Score Background</p>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                  {bg ? <img src={bg} alt="background" className="w-full h-full object-cover" /> : <ImagePlus className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="h-8 px-3 rounded-md bg-muted hover:bg-border text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading…" : "Upload"}
                  </button>
                  {bg && (
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="h-8 px-3 rounded-md bg-muted hover:bg-border text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" /> {downloading ? "Saving…" : "Download image"}
                    </button>
                  )}
                  {bg && (
                    <button
                      onClick={() => onBgChange(null)}
                      className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Clear
                    </button>
                  )}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}