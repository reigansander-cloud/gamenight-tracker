import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// A scrollable picker dialog over a list of string `items`.
// Calls `onSelect(item)` when one is chosen. No search — just a tall,
// momentum-scrollable list for fast browsing.
export default function ListPickerDialog({ open, onClose, title, items = [], onSelect }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-display text-base">{title}</DialogTitle>
        </DialogHeader>

        <div
          className="overflow-y-auto flex-1 min-h-0 -mx-1 px-1 pb-2 space-y-1 overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nothing to pick yet</p>
          ) : (
            items.map((it) => (
              <button
                key={it}
                type="button"
                onClick={() => onSelect(it)}
                className="w-full text-left px-3 py-3 rounded-lg bg-muted/50 hover:bg-muted active:bg-muted/70 text-sm font-medium text-foreground transition-colors"
              >
                {it}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}