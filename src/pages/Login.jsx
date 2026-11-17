import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Link2, Dice5, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/lib/AuthContext";
import { SHEET_URL, getSheetUrl, getSheetKey } from "@/lib/sheet-link";

export default function Login() {
  const { login, authError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState(getSheetUrl());
  const [key, setKey] = useState(getSheetKey());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const askUrl = !SHEET_URL;


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await login({ url: url.trim(), key: key.trim() });
    setLoading(false);
    if (ok) navigate("/", { replace: true });
    else setError("That key didn't work. Check it and try again.");
  };

  if (isAuthenticated) return <Navigate to="/" replace />;

  const shownError = error || (authError?.type === "unknown" ? authError.message : "");

  return (
    <AuthLayout icon={Dice5} title="GameNight" subtitle="Enter the key to open the tracker">
      {shownError && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {shownError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {askUrl && (
          <div className="space-y-2">
            <Label htmlFor="url">Sheet link</Label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="url"
                placeholder="https://script.google.com/macros/s/…/exec"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="key">Key</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="key"
              type="password"
              autoComplete="current-password"
              autoFocus
              placeholder="••••••••••••"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Opening...
            </>
          ) : (
            "Open GameNight"
          )}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground mt-5 text-center">
        This browser remembers the key, so you only enter it once.
      </p>
    </AuthLayout>
  );
}
