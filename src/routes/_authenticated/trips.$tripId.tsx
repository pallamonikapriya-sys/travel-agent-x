import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { getFxRate, getSuggestions } from "@/lib/trips.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Brain, Bus, CheckCircle2, Download, FileText, Hotel, MapPin, Repeat, Utensils, Wrench,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/trips/$tripId")({
  head: () => ({
    meta: [
      { title: "Trip dashboard — TripMind" },
      { name: "description", content: "Day-by-day itinerary, stays, transport, food, packing, documents and live budget for your India trip." },
      { property: "og:title", content: "Trip dashboard — TripMind" },
      { property: "og:description", content: "Your full India itinerary with real costs, maps and an autonomous agent trace." },
    ],
  }),
  component: TripPage,
});

type ItineraryItem = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  cost_estimate: number | null;
  location_name: string | null;
  lat: number | null;
  lng: number | null;
  source_notes: string | null;
  status: string;
  sort_order: number;
};

const TYPE_ICON: Record<string, typeof Bus> = { transport: Bus, stay: Hotel, food: Utensils, activity: MapPin };

function mapSrc(lat: number, lng: number) {
  const d = 0.02;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function TripPage() {
  const { tripId } = useParams({ from: "/_authenticated/trips/$tripId" });
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => (await supabase.from("trips").select("*").eq("id", tripId).single()).data,
  });

  const { data: days } = useQuery({
    queryKey: ["days", tripId],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_itinerary_days")
        .select("id, day_number, date, weather_summary, notes, itinerary_items(*)")
        .eq("trip_id", tripId)
        .order("day_number");
      return (data ?? []).map((d) => ({
        ...d,
        itinerary_items: ([...(d.itinerary_items as ItineraryItem[])]).sort((a, b) => a.sort_order - b.sort_order),
      }));
    },
  });

  const { data: traces } = useQuery({
    queryKey: ["traces", tripId],
    queryFn: async () =>
      (await supabase.from("agent_trace_logs").select("*").eq("trip_id", tripId).order("step_order")).data ?? [],
  });

  useEffect(() => {
    const channel = supabase
      .channel(`trace-${tripId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_trace_logs", filter: `trip_id=eq.${tripId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["traces", tripId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  const allItems = useMemo(() => (days ?? []).flatMap((d) => d.itinerary_items as ItineraryItem[]), [days]);
  const spend = useMemo(() => {
    const totals: Record<string, number> = { transport: 0, stay: 0, food: 0, activity: 0 };
    allItems.filter((i) => i.status !== "skipped").forEach((i) => {
      totals[i.type] = (totals[i.type] ?? 0) + Number(i.cost_estimate ?? 0);
    });
    return totals;
  }, [allItems]);
  const totalSpend = Object.values(spend).reduce((a, b) => a + b, 0);
  const firstPin = allItems.find((i) => i.lat && i.lng);

  const confirm = async () => {
    await supabase.from("trips").update({ status: "confirmed" }).eq("id", tripId);
    queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    toast.success("Itinerary confirmed.");
  };

  const toggleItem = async (item: ItineraryItem) => {
    const next = item.status === "confirmed" ? "proposed" : "confirmed";
    await supabase.from("itinerary_items").update({ status: next }).eq("id", item.id);
    queryClient.invalidateQueries({ queryKey: ["days", tripId] });
  };

  const skipItem = async (item: ItineraryItem) => {
    await supabase.from("itinerary_items").update({ status: "skipped" }).eq("id", item.id);
    queryClient.invalidateQueries({ queryKey: ["days", tripId] });
  };

  if (!trip) return <AppShell tripId={tripId}><p className="text-muted-foreground">Loading trip…</p></AppShell>;

  const budget = Number(trip.budget_total ?? 0);
  const pct = budget > 0 ? Math.min(100, (totalSpend / budget) * 100) : 0;

  return (
    <AppShell tripId={tripId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{trip.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {trip.destination} · {trip.start_date ?? "—"} → {trip.end_date ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-xl">{trip.status}</Badge>
          <Button className="rounded-xl" onClick={confirm} disabled={trip.status === "confirmed"}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {t("confirmItinerary")}
          </Button>
        </div>
      </div>

      {trip.summary && <p className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm shadow-md">{trip.summary}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Tabs defaultValue="itinerary">
          <TabsList className="flex w-full flex-wrap justify-start rounded-xl">
            <TabsTrigger value="itinerary">{t("itinerary")}</TabsTrigger>
            <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
            <TabsTrigger value="transport">{t("transport")}</TabsTrigger>
            <TabsTrigger value="stay">{t("stay")}</TabsTrigger>
            <TabsTrigger value="food">{t("food")}</TabsTrigger>
            <TabsTrigger value="packing">{t("packing")}</TabsTrigger>
            <TabsTrigger value="documents">{t("documents")}</TabsTrigger>
            <TabsTrigger value="currency">{t("currency")}</TabsTrigger>
          </TabsList>

          <TabsContent value="itinerary" className="space-y-4">
            {firstPin && (
              <iframe
                title="Trip map"
                className="h-64 w-full rounded-2xl border border-border"
                src={mapSrc(firstPin.lat!, firstPin.lng!)}
              />
            )}
            {days?.map((day) => (
              <div key={day.id} className="rounded-2xl border border-border bg-card p-5 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">Day {day.day_number} · {day.date ?? ""}</h2>
                  {day.weather_summary && <Badge variant="secondary" className="rounded-xl">{day.weather_summary}</Badge>}
                </div>
                {day.notes && <p className="mt-1 text-sm text-muted-foreground">{day.notes}</p>}
                <ul className="mt-4 space-y-3">
                  {(day.itinerary_items as ItineraryItem[]).map((item) => {
                    const Icon = TYPE_ICON[item.type] ?? MapPin;
                    return (
                      <li
                        key={item.id}
                        className={`flex gap-3 rounded-xl border border-border p-3 ${item.status === "skipped" ? "opacity-50 line-through" : ""}`}
                      >
                        <Icon className="mt-1 h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-medium">{item.title}</span>
                            {item.start_time && <span className="text-xs text-muted-foreground">{item.start_time}{item.end_time ? `–${item.end_time}` : ""}</span>}
                            {item.cost_estimate != null && (
                              <span className="text-xs font-semibold text-primary">₹{Number(item.cost_estimate).toLocaleString("en-IN")}</span>
                            )}
                          </div>
                          {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
                          {item.location_name && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              <MapPin className="mr-1 inline h-3 w-3" />
                              {item.lat && item.lng ? (
                                <a className="hover:text-primary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`}>
                                  {item.location_name}
                                </a>
                              ) : item.location_name}
                            </p>
                          )}
                          {item.source_notes && <p className="mt-1 text-xs italic text-muted-foreground">Why: {item.source_notes}</p>}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant={item.status === "confirmed" ? "default" : "outline"} className="rounded-xl" onClick={() => toggleItem(item)}>
                            {item.status === "confirmed" ? "Confirmed" : "Confirm"}
                          </Button>
                          {item.status !== "skipped" && (
                            <Button size="sm" variant="ghost" className="rounded-xl text-xs" onClick={() => skipItem(item)}>Skip</Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="overview">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-md">
              <h2 className="font-semibold">Cost breakdown</h2>
              <div className="mt-4 space-y-3">
                {Object.entries(spend).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{k}</span>
                      <span className="font-medium">₹{v.toLocaleString("en-IN")}</span>
                    </div>
                    <Progress value={totalSpend ? (v / totalSpend) * 100 : 0} className="mt-1 h-2" />
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <div className="flex justify-between text-sm font-medium">
                  <span>{t("budget")} used</span>
                  <span>₹{totalSpend.toLocaleString("en-IN")} / ₹{budget.toLocaleString("en-IN")}</span>
                </div>
                <Progress value={pct} className="mt-2 h-3" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {budget > 0 ? `₹${Math.max(0, budget - totalSpend).toLocaleString("en-IN")} remaining` : "No budget set for this trip."}
                </p>
              </div>
              <div className="mt-6 space-y-1 text-sm">
                {days?.map((d) => (
                  <p key={d.id}>
                    <span className="font-medium">Day {d.day_number}:</span>{" "}
                    <span className="text-muted-foreground">{(d.itinerary_items as ItineraryItem[]).map((i) => i.title).join(" · ")}</span>
                  </p>
                ))}
              </div>
              <Button variant="outline" className="mt-6 rounded-xl" onClick={() => window.print()}>
                <Download className="mr-2 h-4 w-4" /> Export / print itinerary
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="transport"><SuggestionPanel tripId={tripId} module="transport" lang={lang} /></TabsContent>
          <TabsContent value="stay"><SuggestionPanel tripId={tripId} module="stay" lang={lang} /></TabsContent>
          <TabsContent value="food"><SuggestionPanel tripId={tripId} module="food" lang={lang} /></TabsContent>
          <TabsContent value="packing"><PackingPanel tripId={tripId} /></TabsContent>
          <TabsContent value="documents"><DocumentsPanel tripId={tripId} /></TabsContent>
          <TabsContent value="currency"><CurrencyPanel homeCurrency={trip.budget_currency} totalSpend={totalSpend} days={days?.length ?? 0} /></TabsContent>
        </Tabs>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-md lg:sticky lg:top-24 lg:h-fit">
          <h2 className="flex items-center gap-2 font-semibold"><Brain className="h-4 w-4 text-primary" />{t("agentTrace")}</h2>
          <ol className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto text-sm">
            {traces?.map((s) => (
              <li key={s.id} className="flex gap-2">
                <span className={s.step_type === "tool_call" ? "text-secondary-foreground" : "text-primary"}>
                  {s.step_type === "tool_call" ? <Wrench className="h-4 w-4" /> : s.step_type === "replan" ? <Repeat className="h-4 w-4" /> : s.step_type.startsWith("memory") ? <Brain className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                </span>
                <div>
                  <p className="text-foreground">{s.message}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.step_type}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </AppShell>
  );
}

function SuggestionPanel({ tripId, module, lang }: { tripId: string; module: "stay" | "food" | "transport"; lang: string }) {
  const [items, setItems] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [diet, setDiet] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSuggestions({ data: { tripId, module, lang } });
      setItems(JSON.parse(res.itemsJson) as Record<string, unknown>[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load suggestions");
    } finally {
      setLoading(false);
    }
  };

  const filtered = (items ?? []).filter((i) => module !== "food" || diet === "all" || String(i["diet"] ?? "").includes(diet));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button className="rounded-xl" onClick={load} disabled={loading}>
          {loading ? "Asking the agent…" : items ? "Refresh options" : `Find real ${module} options`}
        </Button>
        {module === "food" && items && (
          <div className="flex gap-2">
            {["all", "veg", "vegan", "halal", "non-veg"].map((d) => (
              <button key={d} onClick={() => setDiet(d)} className={diet === d ? "rounded-xl bg-primary px-3 py-1 text-xs text-primary-foreground" : "rounded-xl bg-muted px-3 py-1 text-xs text-muted-foreground"}>{d}</button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((item, idx) => (
          <div key={idx} className="rounded-2xl border border-border bg-card p-5 shadow-md">
            <h3 className="font-semibold">{String(item["name"] ?? `${item["from"]} → ${item["to"]}`)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {String(item["area"] ?? item["operator_or_route"] ?? "")} {item["cuisine"] ? `· ${String(item["cuisine"])}` : ""} {item["mode"] ? `· ${String(item["mode"])}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {item["price_per_night"] != null && <Badge className="rounded-xl">₹{Number(item["price_per_night"]).toLocaleString("en-IN")}/night</Badge>}
              {item["avg_cost_for_two"] != null && <Badge className="rounded-xl">₹{Number(item["avg_cost_for_two"]).toLocaleString("en-IN")} for two</Badge>}
              {item["cost"] != null && <Badge className="rounded-xl">₹{Number(item["cost"]).toLocaleString("en-IN")}</Badge>}
              {item["rating"] != null && <Badge variant="secondary" className="rounded-xl">★ {String(item["rating"])}</Badge>}
              {item["duration"] != null && <Badge variant="secondary" className="rounded-xl">{String(item["duration"])}</Badge>}
              {item["status"] != null && <Badge variant="secondary" className="rounded-xl">{String(item["status"])}</Badge>}
              {item["diet"] != null && <Badge variant="secondary" className="rounded-xl">{String(item["diet"])}</Badge>}
            </div>
            {(item["guest_summary"] || item["why"] || item["notes"] || item["famous_dish"]) && (
              <p className="mt-2 text-sm text-muted-foreground">
                {String(item["guest_summary"] ?? item["why"] ?? item["notes"] ?? "")}
                {item["famous_dish"] ? ` Must try: ${String(item["famous_dish"])}.` : ""}
              </p>
            )}
            {Array.isArray(item["nearby"]) && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {(item["nearby"] as Array<{ place: string; best_time: string }>).map((n) => (
                  <li key={n.place}>• {n.place} — best {n.best_time}</li>
                ))}
              </ul>
            )}
            {item["lat"] != null && item["lng"] != null && (
              <a
                className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${item["lat"]},${item["lng"]}`}
              >
                Open in Maps
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PackingPanel({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const [newItem, setNewItem] = useState("");
  const { data: items } = useQuery({
    queryKey: ["packing", tripId],
    queryFn: async () => (await supabase.from("packing_lists").select("*").eq("trip_id", tripId).order("category")).data ?? [],
  });

  const toggle = async (id: string, is_packed: boolean) => {
    await supabase.from("packing_lists").update({ is_packed }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["packing", tripId] });
  };

  const add = async () => {
    if (!newItem.trim()) return;
    await supabase.from("packing_lists").insert({ trip_id: tripId, item_name: newItem, category: "custom", auto_generated: false });
    setNewItem("");
    queryClient.invalidateQueries({ queryKey: ["packing", tripId] });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <h2 className="font-semibold">Packing list</h2>
      <div className="mt-4 space-y-2">
        {items?.map((i) => (
          <label key={i.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm">
            <Checkbox checked={i.is_packed} onCheckedChange={(v) => toggle(i.id, Boolean(v))} />
            <span className={i.is_packed ? "line-through text-muted-foreground" : ""}>{i.item_name}</span>
            <Badge variant="secondary" className="ml-auto rounded-xl">{i.category}</Badge>
          </label>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add an item" className="rounded-xl" />
        <Button className="rounded-xl" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

function DocumentsPanel({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState("ticket");
  const { data: docs } = useQuery({
    queryKey: ["docs", tripId],
    queryFn: async () => (await supabase.from("trip_documents").select("*").eq("trip_id", tripId).order("uploaded_at", { ascending: false })).data ?? [],
  });

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    for (const file of Array.from(files)) {
      const path = `${auth.user.id}/${tripId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("trip-documents").upload(path, file);
      if (error) {
        toast.error(error.message);
        continue;
      }
      await supabase.from("trip_documents").insert({
        trip_id: tripId, user_id: auth.user.id, file_name: file.name, file_type: type, storage_path: path,
      });
    }
    toast.success("Uploaded");
    queryClient.invalidateQueries({ queryKey: ["docs", tripId] });
  };

  const download = async (path: string) => {
    const { data } = await supabase.storage.from("trip-documents").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-md">
      <h2 className="font-semibold">Trip documents</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["ticket", "receipt", "visa", "other"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}
        className="mt-4 flex h-32 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-border text-sm text-muted-foreground"
      >
        Drag & drop files here, or click to choose
        <input type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      </label>
      <ul className="mt-4 space-y-2">
        {docs?.map((d) => (
          <li key={d.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm">
            <FileText className="h-4 w-4 text-primary" />
            {d.file_name}
            <Badge variant="secondary" className="rounded-xl">{d.file_type}</Badge>
            <Button size="sm" variant="ghost" className="ml-auto rounded-xl" onClick={() => download(d.storage_path)}>Download</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CurrencyPanel({ homeCurrency, totalSpend, days }: { homeCurrency: string; totalSpend: number; days: number }) {
  const [target, setTarget] = useState("USD");
  const [amount, setAmount] = useState(1000);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRate = async () => {
    setLoading(true);
    try {
      const res = await getFxRate({ data: { base: homeCurrency || "INR", target } });
      setRate(res.rate);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rate unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchRate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [target]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-md">
        <h2 className="font-semibold">Currency converter</h2>
        <div className="mt-4 flex items-center gap-2">
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="rounded-xl" />
          <span className="text-sm text-muted-foreground">{homeCurrency || "INR"}</span>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="w-28 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["USD", "EUR", "GBP", "AED", "SGD", "JPY", "AUD"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="mt-4 text-2xl font-bold text-primary">
          {rate ? `${(amount * rate).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${target}` : loading ? "…" : "—"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Live mid-market rate{rate ? ` · 1 ${homeCurrency || "INR"} = ${rate} ${target}` : ""}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-md">
        <h2 className="font-semibold">Estimated daily spend</h2>
        <p className="mt-4 text-2xl font-bold text-primary">
          ₹{days ? Math.round(totalSpend / days).toLocaleString("en-IN") : 0}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Based on {days} planned day(s) and ₹{totalSpend.toLocaleString("en-IN")} of itinerary costs.</p>
      </div>
    </div>
  );
}
