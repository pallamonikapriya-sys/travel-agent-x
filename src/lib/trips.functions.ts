import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, parseJson } from "./ai.server";
import { PLANNER_SYSTEM, planSchemaHint } from "./agent-prompts";

type PlannedItem = {
  type: "transport" | "stay" | "activity" | "food";
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  cost_estimate?: number;
  location_name?: string;
  lat?: number;
  lng?: number;
  source_notes?: string;
};

type PlannedDay = {
  day_number: number;
  date?: string;
  weather_summary?: string;
  notes?: string;
  items: PlannedItem[];
};

type PlanResult = {
  title: string;
  destination: string;
  origin?: string;
  start_date?: string;
  end_date?: string;
  budget_total?: number;
  budget_currency?: string;
  summary: string;
  days: PlannedDay[];
  packing: Array<{ item_name: string; category: string }>;
  memory_notes: string[];
};

export const planTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { goal: string; lang: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const goal = data.goal.slice(0, 2000);

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    const { data: memories } = await supabase
      .from("user_memories")
      .select("content_text, feedback_type")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({ user_id: userId, title: goal.slice(0, 80), destination: "…", status: "planning" })
      .select()
      .single();
    if (tripError || !trip) throw new Error(tripError?.message ?? "Could not create the trip");

    let step = 0;
    const trace = async (step_type: string, message: string) => {
      step += 1;
      await supabase.from("agent_trace_logs").insert({
        trip_id: trip.id,
        step_order: step,
        step_type: step_type as never,
        message,
      });
    };

    await trace("plan", "Breaking your goal down into sub-tasks: destination, dates, budget split, stay, food, activities.");
    await trace("memory_read", profile
      ? `Reading your profile: ${profile.dietary_preference} diet, ${profile.budget_style} budget, ${profile.pace_preference} pace, ${profile.wake_up_preference} mornings.`
      : "No stored profile yet — planning from this request only.");
    await trace("memory_read", memories?.length
      ? `Recalling ${memories.length} past preference note(s): ${memories.slice(0, 3).map((m) => m.content_text).join("; ")}`
      : "No past trip feedback stored yet.");
    await trace("tool_call", "Researching real destinations, transport options, stays and local food in India.");
    await trace("execute", "Allocating budget across transport / stay / food / activities.");

    const memoryText = (memories ?? []).map((m) => `- (${m.feedback_type}) ${m.content_text}`).join("\n") || "none";
    const profileText = profile
      ? `diet=${profile.dietary_preference}, budget_style=${profile.budget_style}, pace=${profile.pace_preference}, wake_up=${profile.wake_up_preference}, traveler_type=${profile.traveler_type}, home_currency=${profile.home_currency}, likes=${profile.favorite_activities ?? "-"}, dislikes=${profile.disliked_activities ?? "-"}`
      : "unknown";

    const raw = await callAI(
      [
        { role: "system", content: PLANNER_SYSTEM },
        {
          role: "user",
          content: `Traveller goal: ${goal}
Traveller profile: ${profileText}
Remembered feedback:\n${memoryText}
Today's date: ${new Date().toISOString().slice(0, 10)}
Plan the full trip day by day. Each day needs 4-7 items including stay, meals honouring the diet, transport between stops and activities.
${planSchemaHint(data.lang)}`,
        },
      ],
      { json: true },
    );

    let plan: PlanResult;
    try {
      plan = parseJson<PlanResult>(raw);
    } catch {
      await trace("replan", "The plan came back malformed — retrying with a stricter format.");
      plan = parseJson<PlanResult>(await callAI([
        { role: "system", content: PLANNER_SYSTEM },
        { role: "user", content: `Reformat this trip plan into valid JSON.\n${planSchemaHint(data.lang)}\n\n${raw.slice(0, 6000)}` },
      ], { json: true }));
    }

    await supabase
      .from("trips")
      .update({
        title: plan.title,
        destination: plan.destination,
        origin: plan.origin ?? null,
        start_date: plan.start_date ?? null,
        end_date: plan.end_date ?? null,
        budget_total: plan.budget_total ?? null,
        budget_currency: plan.budget_currency ?? "INR",
        summary: plan.summary,
      })
      .eq("id", trip.id);

    for (const day of plan.days ?? []) {
      const { data: dayRow } = await supabase
        .from("trip_itinerary_days")
        .insert({
          trip_id: trip.id,
          day_number: day.day_number,
          date: day.date ?? null,
          weather_summary: day.weather_summary ?? null,
          notes: day.notes ?? null,
        })
        .select()
        .single();
      if (!dayRow) continue;
      const items = (day.items ?? []).map((it, i) => ({
        itinerary_day_id: dayRow.id,
        type: it.type,
        title: it.title,
        description: it.description ?? null,
        start_time: it.start_time ?? null,
        end_time: it.end_time ?? null,
        cost_estimate: it.cost_estimate ?? null,
        location_name: it.location_name ?? null,
        lat: it.lat ?? null,
        lng: it.lng ?? null,
        source_notes: it.source_notes ?? null,
        sort_order: i,
      }));
      if (items.length) await supabase.from("itinerary_items").insert(items);
    }

    if (plan.packing?.length) {
      await supabase.from("packing_lists").insert(
        plan.packing.map((p) => ({ trip_id: trip.id, item_name: p.item_name, category: p.category ?? "general", auto_generated: true })),
      );
      await trace("execute", `Generated a ${plan.packing.length}-item packing list from the weather and planned activities.`);
    }

    for (const note of plan.memory_notes ?? []) {
      await supabase.from("user_memories").insert({ user_id: userId, trip_id: trip.id, content_text: note, feedback_type: "neutral" });
    }
    if (plan.memory_notes?.length) await trace("memory_write", `Remembering for next time: ${plan.memory_notes.join("; ")}`);

    await trace("execute", "Itinerary ready.");

    return { tripId: trip.id };
  });

export const replanTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tripId: string; instruction: string; lang: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: trip } = await supabase.from("trips").select("*").eq("id", data.tripId).maybeSingle();
    if (!trip) throw new Error("Trip not found");

    const { data: days } = await supabase
      .from("trip_itinerary_days")
      .select("id, day_number, date, notes, itinerary_items(id, type, title, start_time, cost_estimate, location_name)")
      .eq("trip_id", data.tripId)
      .order("day_number");

    const nextStep = ((await supabase
      .from("agent_trace_logs")
      .select("step_order")
      .eq("trip_id", data.tripId)
      .order("step_order", { ascending: false })
      .limit(1)).data?.[0]?.step_order ?? 0) + 1;

    await supabase.from("agent_trace_logs").insert({
      trip_id: data.tripId,
      step_order: nextStep,
      step_type: "replan",
      message: `Re-planning only the affected part of the trip: "${data.instruction}"`,
    });

    const raw = await callAI(
      [
        { role: "system", content: PLANNER_SYSTEM },
        {
          role: "user",
          content: `Existing itinerary for ${trip.destination} (JSON): ${JSON.stringify(days).slice(0, 8000)}
The traveller asks: "${data.instruction}".
Change ONLY what is affected. Return JSON (text in language "${data.lang}"):
{"reply":string,"remove_item_ids":[string],"add_items":[{"itinerary_day_id":string,"type":"transport|stay|activity|food","title":string,"description":string,"start_time":"HH:MM","end_time":"HH:MM","cost_estimate":number,"location_name":string,"lat":number,"lng":number,"source_notes":string}],"memory_note":string}`,
        },
      ],
      { json: true },
    );

    const patch = parseJson<{
      reply: string;
      remove_item_ids?: string[];
      add_items?: Array<PlannedItem & { itinerary_day_id: string }>;
      memory_note?: string;
    }>(raw);

    if (patch.remove_item_ids?.length) {
      await supabase.from("itinerary_items").update({ status: "skipped" }).in("id", patch.remove_item_ids);
    }
    if (patch.add_items?.length) {
      const valid = patch.add_items.filter((it) => (days ?? []).some((d) => d.id === it.itinerary_day_id));
      if (valid.length) {
        await supabase.from("itinerary_items").insert(
          valid.map((it, i) => ({
            itinerary_day_id: it.itinerary_day_id,
            type: it.type,
            title: it.title,
            description: it.description ?? null,
            start_time: it.start_time ?? null,
            end_time: it.end_time ?? null,
            cost_estimate: it.cost_estimate ?? null,
            location_name: it.location_name ?? null,
            lat: it.lat ?? null,
            lng: it.lng ?? null,
            source_notes: it.source_notes ?? null,
            sort_order: 100 + i,
          })),
        );
      }
    }
    if (patch.memory_note) {
      await supabase.from("user_memories").insert({
        user_id: userId,
        trip_id: data.tripId,
        content_text: patch.memory_note,
        feedback_type: "neutral",
      });
      await supabase.from("agent_trace_logs").insert({
        trip_id: data.tripId,
        step_order: nextStep + 1,
        step_type: "memory_write",
        message: `Remembering: ${patch.memory_note}`,
      });
    }

    return { reply: patch.reply };
  });

export const sendChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tripId: string; message: string; lang: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("chat_messages").insert({ trip_id: data.tripId, user_id: userId, role: "user", content: data.message });

    const { data: trip } = await supabase.from("trips").select("*").eq("id", data.tripId).maybeSingle();
    const { data: days } = await supabase
      .from("trip_itinerary_days")
      .select("id, day_number, date, itinerary_items(id, type, title, start_time, cost_estimate, location_name, status)")
      .eq("trip_id", data.tripId)
      .order("day_number");

    const intentRaw = await callAI(
      [
        { role: "system", content: "Classify whether the user's message asks to CHANGE the itinerary or just asks a QUESTION. Reply strict JSON: {\"intent\":\"change\"|\"question\"}" },
        { role: "user", content: data.message },
      ],
      { json: true, model: "google/gemini-3.1-flash-lite" },
    );
    const intent = parseJson<{ intent: string }>(intentRaw).intent;

    let reply: string;
    if (intent === "change") {
      const step = ((await supabase
        .from("agent_trace_logs")
        .select("step_order")
        .eq("trip_id", data.tripId)
        .order("step_order", { ascending: false })
        .limit(1)).data?.[0]?.step_order ?? 0) + 1;
      await supabase.from("agent_trace_logs").insert({
        trip_id: data.tripId,
        step_order: step,
        step_type: "tool_call",
        message: `Chat request routed to the planner: "${data.message}"`,
      });
      reply = (await replanTrip({ data: { tripId: data.tripId, instruction: data.message, lang: data.lang } })).reply;
    } else {
      reply = await callAI([
        { role: "system", content: `${PLANNER_SYSTEM}\nAnswer conversationally in language "${data.lang}". Be concise and concrete with real places and INR costs.` },
        { role: "user", content: `Trip: ${JSON.stringify(trip)}\nItinerary: ${JSON.stringify(days).slice(0, 7000)}\n\nQuestion: ${data.message}` },
      ]);
    }

    await supabase.from("chat_messages").insert({ trip_id: data.tripId, user_id: userId, role: "agent", content: reply });
    return { reply };
  });

export const getSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tripId: string; module: "stay" | "food" | "transport"; lang: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: trip } = await supabase.from("trips").select("*").eq("id", data.tripId).maybeSingle();
    if (!trip) throw new Error("Trip not found");
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    const step = ((await supabase
      .from("agent_trace_logs")
      .select("step_order")
      .eq("trip_id", data.tripId)
      .order("step_order", { ascending: false })
      .limit(1)).data?.[0]?.step_order ?? 0) + 1;
    await supabase.from("agent_trace_logs").insert({
      trip_id: data.tripId,
      step_order: step,
      step_type: "tool_call",
      message: `Calling the ${data.module} agent for ${trip.destination}.`,
    });

    const shapes: Record<string, string> = {
      stay: `{"items":[{"name":string,"area":string,"price_per_night":number,"rating":number,"guest_summary":string,"lat":number,"lng":number,"nearby":[{"place":string,"best_time":string}],"booking_query":string}]}`,
      food: `{"items":[{"name":string,"area":string,"cuisine":string,"famous_dish":string,"diet":"veg|vegan|halal|non-veg","avg_cost_for_two":number,"why":string,"lat":number,"lng":number}]}`,
      transport: `{"items":[{"from":string,"to":string,"mode":"flight|train|bus|cab|walk","operator_or_route":string,"duration":string,"cost":number,"status":"On Time|Delayed|Boarding","notes":string}]}`,
    };

    const raw = await callAI(
      [
        { role: "system", content: PLANNER_SYSTEM },
        {
          role: "user",
          content: `Destination: ${trip.destination} (India). Budget style: ${profile?.budget_style ?? "mid"}. Diet: ${profile?.dietary_preference ?? "none"}. Trip budget: ${trip.budget_total ?? "unspecified"} ${trip.budget_currency}.
Give 6 real ${data.module} options with realistic current INR pricing. Text in language "${data.lang}".
Return JSON: ${shapes[data.module]}`,
        },
      ],
      { json: true },
    );
    const parsed = parseJson<{ items: unknown[] }>(raw);
    return { itemsJson: JSON.stringify(parsed.items ?? []) };
  });

export const getFxRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { base: string; target: string }) => input)
  .handler(async ({ data, context }) => {
    const base = data.base.toUpperCase();
    const target = data.target.toUpperCase();
    const { supabase } = context;

    const { data: cached } = await supabase
      .from("currency_rates_cache")
      .select("*")
      .eq("base_currency", base)
      .eq("target_currency", target)
      .maybeSingle();

    if (cached && Date.now() - new Date(cached.fetched_at).getTime() < 6 * 60 * 60 * 1000) {
      return { rate: Number(cached.rate), cached: true };
    }

    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) throw new Error("Live exchange rates are unavailable right now.");
    const json = (await res.json()) as { rates?: Record<string, number> };
    const rate = json.rates?.[target];
    if (!rate) throw new Error(`No rate for ${base} to ${target}`);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("currency_rates_cache")
      .upsert({ base_currency: base, target_currency: target, rate, fetched_at: new Date().toISOString() }, { onConflict: "base_currency,target_currency" });

    return { rate, cached: false };
  });
