import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/trips/")({
  head: () => ({
    meta: [
      { title: "My Trips — TripMind" },
      { name: "description", content: "All your planned, confirmed and completed India trips in one place, with budgets and day counts." },
      { property: "og:title", content: "My Trips — TripMind" },
      { property: "og:description", content: "All your planned and confirmed India trips in one place." },
    ],
  }),
  component: TripsPage,
});

function TripsPage() {
  const { t } = useI18n();
  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("myTrips")}</h1>
        <Link to="/">
          <Button className="rounded-xl">{t("planMyTrip")}</Button>
        </Link>
      </div>

      {isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}
      {!isLoading && !trips?.length && <p className="mt-6 text-muted-foreground">{t("noTrips")}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trips?.map((trip) => (
          <Link key={trip.id} to="/trips/$tripId" params={{ tripId: trip.id }} className="rounded-2xl border border-border bg-card p-5 shadow-md transition-shadow hover:shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">{trip.title}</h2>
              <Badge variant="secondary" className="rounded-xl">{trip.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{trip.destination}</p>
            <p className="mt-3 text-sm">
              {trip.start_date ?? "—"} → {trip.end_date ?? "—"}
            </p>
            {trip.budget_total != null && (
              <p className="mt-1 text-sm font-medium text-primary">
                {trip.budget_currency} {Number(trip.budget_total).toLocaleString("en-IN")}
              </p>
            )}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
