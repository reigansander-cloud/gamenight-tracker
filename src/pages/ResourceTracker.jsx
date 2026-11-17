import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

let nextId = 1;

function ResourceSlider({ resource, onChange, onDelete }) {
  const [editOpen, setEditOpen] = useState(false);
  const [editMax, setEditMax] = useState(String(resource.max));
  const [editName, setEditName] = useState(resource.name);

  const pct = resource.max > 0 ? resource.current / resource.max * 100 : 0;

  const commitEdit = () => {
    const newMax = Math.max(1, Number(editMax) || 1);
    onChange({ ...resource, name: editName, max: newMax, current: Math.min(resource.current, newMax) });
    setEditOpen(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button
          className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
          onClick={() => {setEditMax(String(resource.max));setEditName(resource.name);setEditOpen(true);}}>
          
          {resource.name}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums text-muted-foreground">{resource.current} / {resource.max}</span>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom slider track */}
      <div className="relative h-8 flex items-center">
        <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${pct}%` }} />
          
        </div>
        <input
          type="range"
          min={0}
          max={resource.max}
          value={resource.current}
          onChange={(e) => onChange({ ...resource, current: Number(e.target.value) })}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-8" />
        
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Max Value</label>
              <Input value={editMax} onChange={(e) => setEditMax(e.target.value)} inputMode="numeric" />
            </div>
            <Button className="w-full" onClick={commitEdit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}

export default function ResourceTracker() {
  const [resources, setResources] = useState([
  { id: nextId++, name: "Health", max: 20, current: 20 }]
  );
  const [newName, setNewName] = useState("");

  const addResource = () => {
    const name = newName.trim() || "Resource";
    setResources((prev) => [...prev, { id: nextId++, name, max: 10, current: 10 }]);
    setNewName("");
  };

  const updateResource = (updated) => {
    setResources((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  };

  const deleteResource = (id) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">Resource Tracker</h1>
        
      </div>

      <div className="space-y-3">
        {resources.map((r) =>
        <ResourceSlider
          key={r.id}
          resource={r}
          onChange={updateResource}
          onDelete={() => deleteResource(r.id)} />

        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Resource name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addResource()} />
        
        <Button onClick={addResource} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
    </div>);

}