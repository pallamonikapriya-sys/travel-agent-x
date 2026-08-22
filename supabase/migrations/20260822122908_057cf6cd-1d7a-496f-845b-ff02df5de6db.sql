
CREATE TYPE public.dietary_pref AS ENUM ('veg','vegan','halal','none','other');
CREATE TYPE public.budget_style AS ENUM ('budget','mid','luxury');
CREATE TYPE public.pace_pref AS ENUM ('relaxed','balanced','packed');
CREATE TYPE public.wake_pref AS ENUM ('early','flexible','late');
CREATE TYPE public.trip_status AS ENUM ('planning','confirmed','completed');
CREATE TYPE public.item_type AS ENUM ('transport','stay','activity','food');
CREATE TYPE public.item_status AS ENUM ('proposed','confirmed','skipped');
CREATE TYPE public.trace_step AS ENUM ('plan','tool_call','memory_read','memory_write','execute','replan');
CREATE TYPE public.feedback_type AS ENUM ('liked','disliked','neutral');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  home_currency text NOT NULL DEFAULT 'INR',
  preferred_language text NOT NULL DEFAULT 'en',
  dietary_preference public.dietary_pref NOT NULL DEFAULT 'none',
  budget_style public.budget_style NOT NULL DEFAULT 'mid',
  pace_preference public.pace_pref NOT NULL DEFAULT 'balanced',
  wake_up_preference public.wake_pref NOT NULL DEFAULT 'flexible',
  traveler_type text NOT NULL DEFAULT 'solo',
  favorite_activities text,
  disliked_activities text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  destination text NOT NULL,
  origin text,
  start_date date,
  end_date date,
  budget_total numeric,
  budget_currency text NOT NULL DEFAULT 'INR',
  status public.trip_status NOT NULL DEFAULT 'planning',
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trips" ON public.trips FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.trip_itinerary_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_number int NOT NULL,
  date date,
  weather_summary text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_itinerary_days TO authenticated;
GRANT ALL ON public.trip_itinerary_days TO service_role;
ALTER TABLE public.trip_itinerary_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own days" ON public.trip_itinerary_days FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()));

CREATE TABLE public.itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_day_id uuid NOT NULL REFERENCES public.trip_itinerary_days(id) ON DELETE CASCADE,
  type public.item_type NOT NULL DEFAULT 'activity',
  title text NOT NULL,
  description text,
  start_time text,
  end_time text,
  cost_estimate numeric,
  location_name text,
  lat double precision,
  lng double precision,
  source_notes text,
  status public.item_status NOT NULL DEFAULT 'proposed',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itinerary_items TO authenticated;
GRANT ALL ON public.itinerary_items TO service_role;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own items" ON public.itinerary_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_itinerary_days d JOIN public.trips t ON t.id = d.trip_id WHERE d.id = itinerary_day_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trip_itinerary_days d JOIN public.trips t ON t.id = d.trip_id WHERE d.id = itinerary_day_id AND t.user_id = auth.uid()));

CREATE TABLE public.agent_trace_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  step_order int NOT NULL DEFAULT 0,
  step_type public.trace_step NOT NULL DEFAULT 'plan',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_trace_logs TO authenticated;
GRANT ALL ON public.agent_trace_logs TO service_role;
ALTER TABLE public.agent_trace_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own traces" ON public.agent_trace_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()));
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_trace_logs;

CREATE TABLE public.user_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  content_text text NOT NULL,
  feedback_type public.feedback_type NOT NULL DEFAULT 'neutral',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_memories TO authenticated;
GRANT ALL ON public.user_memories TO service_role;
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memories" ON public.user_memories FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.packing_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_packed boolean NOT NULL DEFAULT false,
  auto_generated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packing_lists TO authenticated;
GRANT ALL ON public.packing_lists TO service_role;
ALTER TABLE public.packing_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own packing" ON public.packing_lists FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()));

CREATE TABLE public.trip_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'other',
  storage_path text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_documents TO authenticated;
GRANT ALL ON public.trip_documents TO service_role;
ALTER TABLE public.trip_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own docs" ON public.trip_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chat" ON public.chat_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.currency_rates_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL,
  target_currency text NOT NULL,
  rate numeric NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base_currency, target_currency)
);
GRANT SELECT ON public.currency_rates_cache TO authenticated, anon;
GRANT ALL ON public.currency_rates_cache TO service_role;
ALTER TABLE public.currency_rates_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read rates" ON public.currency_rates_cache FOR SELECT TO authenticated, anon USING (true);

CREATE INDEX ON public.trips (user_id, created_at DESC);
CREATE INDEX ON public.trip_itinerary_days (trip_id);
CREATE INDEX ON public.itinerary_items (itinerary_day_id);
CREATE INDEX ON public.agent_trace_logs (trip_id, step_order);
CREATE INDEX ON public.chat_messages (trip_id, created_at);
