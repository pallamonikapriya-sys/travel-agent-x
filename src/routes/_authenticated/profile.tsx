import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Travel preferences — TripMind" },
      { name: "description", content: "Set your diet, budget style, pace, wake-up preference and traveller type so TripMind plans every trip around you." },
      { property: "og:title", content: "Travel preferences — TripMind" },
      { property: "og:description", content: "Tune the preferences your autonomous travel agent plans around." },
    ],
  }),
  component: ProfilePage,
});

const OPTIONS = {
  dietary_preference: ["veg", "vegan", "halal", "none", "other"],
  budget_style: ["budget", "mid", "luxury"],
  pace_preference: ["relaxed", "balanced", "packed"],
  wake_up_preference: ["early", "flexible", "late"],
  traveler_type: ["solo", "family", "business", "adventure", "couple"],
} as const;

const LABELS: Record<string, string> = {
  dietary_preference: "Dietary preference",
  budget_style: "Budget style",
  pace_preference: "Trip pace",
  wake_up_preference: "Wake-up preference",
  traveler_type: "Traveller type",
};

function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("profiles").select("*").eq("id", auth.user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: memories } = useQuery({
    queryKey: ["memories"],
    queryFn: async () => {
      const { data } = await supabase.from("user_memories").select("*").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const save = async (patch: Record<string, string>) => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update(patch as never).eq("id", profile.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved — future plans will use this.");
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  if (!profile) return <AppShell><p className="text-muted-foreground">Loading…</p></AppShell>;

  return (
    <AppShell>
      <h1 className="text-3xl font-bold tracking-tight">Your travel preferences</h1>
      <p className="mt-1 text-muted-foreground">Changes here immediately shape every new plan and re-plan.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-md lg:col-span-2">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input
                defaultValue={profile.full_name ?? ""}
                onBlur={(e) => save({ full_name: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Home currency</Label>
              <Input
                defaultValue={profile.home_currency}
                onBlur={(e) => save({ home_currency: e.target.value.toUpperCase() })}
                className="rounded-xl"
              />
            </div>
            {(Object.keys(OPTIONS) as Array<keyof typeof OPTIONS>).map((field) => (
              <div key={field} className="space-y-2">
                <Label>{LABELS[field]}</Label>
                <Select defaultValue={String(profile[field])} onValueChange={(v) => save({ [field]: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPTIONS[field].map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="space-y-2 md:col-span-2">
              <Label>Favourite activities</Label>
              <Input defaultValue={profile.favorite_activities ?? ""} onBlur={(e) => save({ favorite_activities: e.target.value })} placeholder="food walks, heritage forts, live music" className="rounded-xl" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Disliked activities</Label>
              <Input defaultValue={profile.disliked_activities ?? ""} onBlur={(e) => save({ disliked_activities: e.target.value })} placeholder="beach days, long bus rides" className="rounded-xl" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-md">
          <h2 className="font-semibold">What TripMind remembers</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {memories?.length ? memories.map((m) => <li key={m.id}>• {m.content_text}</li>) : <li>Nothing yet — plan a trip and give feedback in chat.</li>}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
