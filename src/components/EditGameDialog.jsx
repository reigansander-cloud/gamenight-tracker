import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, X, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function EditGameDialog({ game, open, onClose }) {
  const queryClient = useQueryClient();
  const [gameName, setGameName] = useState("");
  const [datePlayed, setDatePlayed] = useState("");
  const [players, setPlayers] = useState([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (game) {
      setGameName(game.game_name || "");
      setDatePlayed(game.date_played || "");
      setPlayers(game.players?.map((p) => ({ ...p })) || []);
      setNotes(game.notes || "");
    }
  }, [game]);

  const updateGame = useMutation({
    mutationFn: (data) => base44.entities.GameLog.update(game.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamelogs"] });
      toast.success("Game updated!");
      onClose();
    },
  });

  const updatePlayer = (i, field, value) => {
    const next = [...players];
    next[i] = { ...next[i], [field]: value };
    setPlayers(next);
  };

  const handleSave = () => {
    const validPlayers = players.filter((p) => p.name?.trim());
    if (!gameName.trim() || validPlayers.length < 1) {
      toast.error("Game name and at least 1 player required");
      return;
    }
    updateGame.mutate({
      game_name: gameName.trim(),
      date_played: datePlayed,
      players: validPlayers.map((p) => ({
        name: p.name.trim(),
        faction: p.faction?.trim() || undefined,
        score: p.score != null && p.score !== "" ? Number(p.score) : undefined,
        is_winner: p.is_winner || false,
      })),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Game</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Game Name</label>
            <Input value={gameName} onChange={(e) => setGameName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Date Played</label>
            <Input type="date" value={datePlayed} onChange={(e) => setDatePlayed(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Players</label>
              <Button type="button" variant="outline" size="sm" onClick={() => setPlayers([...players, { name: "", score: undefined, is_winner: false }])}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                  <Input
                    placeholder="Name"
                    value={p.name || ""}
                    onChange={(e) => updatePlayer(i, "name", e.target.value)}
                    className="flex-1 bg-card h-8 text-sm"
                  />
                  <Input
                    placeholder="Played as"
                    value={p.faction || ""}
                    onChange={(e) => updatePlayer(i, "faction", e.target.value)}
                    className="w-24 bg-card h-8 text-sm"
                  />
                  <Input
                    placeholder="Score"
                    type="number"
                    value={p.score ?? ""}
                    onChange={(e) => updatePlayer(i, "score", e.target.value)}
                    className="w-20 bg-card h-8 text-sm"
                  />
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      checked={p.is_winner || false}
                      onCheckedChange={(v) => updatePlayer(i, "is_winner", !!v)}
                      id={`edit-winner-${i}`}
                    />
                    <label htmlFor={`edit-winner-${i}`} className="cursor-pointer">
                      <Trophy className="w-3.5 h-3.5 text-accent" />
                    </label>
                  </div>
                  {players.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setPlayers(players.filter((_, j) => j !== i))}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={updateGame.isPending}>
              {updateGame.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}