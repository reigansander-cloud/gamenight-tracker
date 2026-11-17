import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CustomFactionManager from "@/components/CustomFactionManager";
import CustomScoresheetManager from "@/components/CustomScoresheetManager";
import LiveScoreTemplates from "@/components/LiveScoreTemplates";
import { SCHEMES, applyScheme } from "@/lib/theme";

export default function Settings() {
  const queryClient = useQueryClient();

  // Fetch user preferences from database
  const { data: prefsData, isLoading: prefsLoading } = useQuery({
    queryKey: ["userPreferences"],
    queryFn: async () => {
      const result = await base44.entities.UserPreferences.filter({});
      return result?.[0] || null;
    },
  });

  const [activeScheme, setActiveScheme] = useState("royal");
  const customFactions = prefsData?.custom_factions || {};
  const customScoresheets = prefsData?.custom_scoresheets || {};
  const liveScoreTemplates = prefsData?.live_score_templates || {};

  // Sync active scheme indicator when DB loads
  useEffect(() => {
    if (prefsData?.color_scheme) {
      setActiveScheme(prefsData.color_scheme);
      applyScheme(prefsData.color_scheme);
      localStorage.setItem("colorScheme", prefsData.color_scheme);
    }
  }, [prefsData?.color_scheme]);

  // Mutation to save preferences
  const savePrefsMutation = useMutation({
    mutationFn: async (data) => {
      if (prefsData?.id) {
        return base44.entities.UserPreferences.update(prefsData.id, data);
      } else {
        return base44.entities.UserPreferences.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPreferences"] });
    },
  });

  const saveCustomFactions = (val) => {
    savePrefsMutation.mutate({ custom_factions: val });
  };

  const saveCustomScoresheets = (val) => {
    savePrefsMutation.mutate({ custom_scoresheets: val });
  };

  const saveLiveScoreTemplates = (val) => {
    savePrefsMutation.mutate({ live_score_templates: val });
  };

  const selectScheme = (id) => {
    setActiveScheme(id);
    localStorage.setItem("colorScheme", id);
    applyScheme(id); // immediate update
    savePrefsMutation.mutate({ color_scheme: id });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Customize themes, factions, scoresheets, and starting scores.</p>
      </div>

      {/* Theme picker */}
      <div className="border border-border rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Theme</p>
        <div className="flex flex-wrap gap-2">
          {SCHEMES.map((s) => (
            <button
              key={s.id}
              onClick={() => selectScheme(s.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                activeScheme === s.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted text-foreground"
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: `hsl(${s.primary})` }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <CustomFactionManager customFactions={customFactions} onChange={saveCustomFactions} />
        <CustomScoresheetManager customScoresheets={customScoresheets} onChange={saveCustomScoresheets} />
        <LiveScoreTemplates templates={liveScoreTemplates} onChange={saveLiveScoreTemplates} />
      </div>
    </div>
  );
}