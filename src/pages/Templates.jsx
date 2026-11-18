import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CustomFactionManager from "@/components/CustomFactionManager";
import CustomScoresheetManager from "@/components/CustomScoresheetManager";
import LiveScoreTemplates from "@/components/LiveScoreTemplates";

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

  const customFactions = prefsData?.custom_factions || {};
  const customScoresheets = prefsData?.custom_scoresheets || {};
  const liveScoreTemplates = prefsData?.live_score_templates || {};

  // Mutation to save preferences
  const savePrefsMutation = useMutation({
    mutationFn: async (data) => {
      if (prefsData?.id) {
        return base44.entities.UserPreferences.update(prefsData.id, data);
      } else {
        return base44.entities.UserPreferences.create(data);
      }
    },
    // Show the change straight away, so quick edits (adding several categories in a row)
    // each build on the one before instead of on the last saved copy.
    onMutate: (data) => {
      queryClient.setQueryData(["userPreferences"], (old) => ({ ...(old || {}), ...data }));
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


  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Customize factions, scoresheets, and starting scores.</p>
      </div>

      <div className="space-y-3">
        <CustomFactionManager customFactions={customFactions} onChange={saveCustomFactions} />
        <CustomScoresheetManager customScoresheets={customScoresheets} onChange={saveCustomScoresheets} />
        <LiveScoreTemplates templates={liveScoreTemplates} onChange={saveLiveScoreTemplates} />
      </div>
    </div>
  );
}