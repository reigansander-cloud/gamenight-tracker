import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Trophy, Calendar, Trash2, Users, Pencil } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import EditGameDialog from "@/components/EditGameDialog";

export default function History() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingGame, setEditingGame] = useState(null);
  const { data: games = [], isLoading } = useQuery({
    queryKey: ["gamelogs"],
    queryFn: () => base44.entities.GameLog.list("-created_date", 200),
  });

  const deleteGame = useMutation({
    mutationFn: (id) => base44.entities.GameLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gamelogs"] });
      toast.success("Game removed from history");
    },
  });

  const filtered = games.filter(
    (g) =>
      g.game_name?.toLowerCase().includes(search.toLowerCase()) ||
      g.players?.some((p) => p.name?.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">Game History</h1>
        <p className="text-muted-foreground text-sm mt-1">Every battle, every victory, every rematch</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search games or players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-display font-semibold text-foreground">No games yet</p>
          <p className="text-sm text-muted-foreground mt-1">Time to roll the dice!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((game) => {
            const winners = game.players?.filter((p) => p.is_winner) || [];
            return (
              <div key={game.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-semibold text-foreground">{game.game_name}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {game.date_played ? format(new Date(game.date_played), "MMM d, yyyy") : "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {game.players?.length || 0} players
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {game.players?.map((p, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            p.is_winner
                              ? "bg-accent/20 text-accent-foreground border border-accent/30"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {p.is_winner && <Trophy className="w-3 h-3 text-accent" />}
                          {p.name}
                          {p.faction && <span className="text-muted-foreground/80 italic ml-0.5">· {p.faction}</span>}
                          {p.score != null && <span className="text-muted-foreground ml-1">({p.score})</span>}
                        </span>
                      ))}
                    </div>
                    {game.notes && <p className="text-xs text-muted-foreground mt-2 italic">"{game.notes}"</p>}
                  </div>
                  <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setEditingGame(game)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this game?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently remove this game from your history.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteGame.mutate(game.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingGame && (
        <EditGameDialog
          game={editingGame}
          open={!!editingGame}
          onClose={() => setEditingGame(null)}
        />
      )}
    </div>
  );
}