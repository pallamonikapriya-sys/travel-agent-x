import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { planTrip } from "@/lib/trips.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Brain, Compass, Sparkles, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TripMind — Autonomous AI travel agent for India" },
      { name: "description", content: "Describe your trip once and TripMind plans real day-by-day India itineraries with genuine hotels, food, transport and INR costs — and remembers what you like." },
      { property: "og:title", content: "TripMind — Autonomous AI travel agent for India" },
      { property: "og:description", content: "One prompt in, a full day-by-day India itinerary out: real places, real costs, real memory." },
    ],
  }),
  component: HomePage,
});

type Profile = {
  full_name: string | null;
  dietary_preference: string;
  budget_style: string;
  pace_preference: string;
};

const CHIPS = {
  budget_style: ["budget", "mid", "luxury"],
  pace_preference: ["relaxed", "balanced", "packed"],
  dietary_preference: ["veg", "vegan", "halal", "none"],
} as const;

const STEPS = [
  "Breaking your goal into sub-tasks…",
  "Reading your saved preferences and past trip feedback…",
  "Researching real stays, transport and food for your destination…",
  "Allocating your budget across transport / stay / food / activities…",
  "Assembling the day-by-day itinerary…",
];

function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [planning, setPlanning] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setSignedIn(true);
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, dietary_preference, budget_style, pace_preference")
        .eq("id", data.user.id)
        .maybeSingle();
      setProfile(p);
    });
  }, []);

  useEffect(() => {
    if (!planning) return;
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 4000);
    return () => clearInterval(id);
  }, [planning]);

  const setPref = async (field: keyof typeof CHIPS, value: string) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("profiles").update({ [field]: value }).eq("id", data.user.id);
    setProfile((p) => (p ? { ...p, [field]: value } : p));
  };

  const plan = async () => {
    if (!signedIn) {
      navigate({ to: "/auth" });
      return;
    }
    if (goal.trim().length < 8) {
      toast.error("Tell TripMind a bit more about your trip.");
      return;
    }
    setPlanning(true);
    try {
      const { tripId } = await planTrip({ data: { goal, lang: localStorage.getItem("tripmind-lang") ?? "en" } });
      navigate({ to: "/trips/$tripId", params: { tripId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Planning failed");
    } finally {
      setPlanning(false);
    }
  };

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl pt-6 text-center">
        <Badge className="rounded-xl bg-accent text-accent-foreground">Autonomous agent · not a chatbot</Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">{t("heroTitle")}</h1>
        <p className="mt-3 text-muted-foreground">{t("heroSub")}</p>

        {profile && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-left text-sm shadow-md">
            <span className="font-semibold text-primary">{t("welcomeBack")}{profile.full_name ? `, ${profile.full_name}` : ""} — </span>
            <span className="text-muted-foreground">
              I remembered you prefer a {profile.pace_preference} pace, {profile.budget_style} budgets and {profile.dietary_preference} food.
            </span>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-md">
          <Textarea
            rows={4}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={t("goalPlaceholder")}
            className="resize-none rounded-xl border-0 text-base shadow-none focus-visible:ring-0"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(CHIPS) as Array<keyof typeof CHIPS>).map((field) =>
              CHIPS[field].map((value) => (
                <button
                  key={`${field}-${value}`}
                  onClick={() => setPref(field, value)}
                  disabled={!signedIn}
                  className={
                    profile?.[field] === value
                      ? "rounded-xl bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                      : "rounded-xl bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }
                >
                  {value}
                </button>
              )),
            )}
          </div>
          <Button className="mt-4 w-full rounded-xl py-6 text-base" onClick={plan} disabled={planning}>
            <Sparkles className="mr-2 h-4 w-4" />
            {planning ? "Planning…" : t("planMyTrip")}
          </Button>
        </div>

        {planning && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-left shadow-md">
            <p className="text-sm font-semibold">{t("agentTrace")}</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {STEPS.slice(0, step + 1).map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="text-primary">▸</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10 grid gap-4 text-left md:grid-cols-3">
          {[
            { icon: Brain, title: "Real memory", body: "It stores what you loved and hated and folds that into every future plan." },
            { icon: Compass, title: "Real places", body: "Genuine Indian hotels, restaurants, trains and attractions with live map pins." },
            { icon: Wallet, title: "Real budgets", body: "INR cost estimates per item plus live currency conversion for your home currency." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5 shadow-md">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
