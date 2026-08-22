import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

type Dict = Record<string, string>;

const en: Dict = {
  home: "Home",
  myTrips: "My Trips",
  chat: "Chat",
  profile: "Profile",
  signIn: "Sign in",
  signOut: "Sign out",
  planMyTrip: "Plan My Trip",
  askTripMind: "Ask TripMind",
  heroTitle: "Your autonomous travel agent for India",
  heroSub: "One prompt in, a full day-by-day itinerary out — with real places, real costs and memory of what you like.",
  goalPlaceholder: "Where do you want to go, and what matters to you? e.g. Plan a 3-day trip to Goa under ₹15,000, I'm vegetarian and hate early mornings",
  welcomeBack: "Welcome back",
  planning: "Planning",
  overview: "Overview",
  itinerary: "Itinerary",
  transport: "Transport",
  stay: "Stay",
  food: "Food",
  packing: "Packing",
  documents: "Documents",
  currency: "Currency",
  agentTrace: "Agent trace",
  confirmItinerary: "Confirm Itinerary",
  budget: "Budget",
  noTrips: "No trips yet. Plan your first one.",
};

const hi: Dict = {
  home: "होम",
  myTrips: "मेरी यात्राएँ",
  chat: "चैट",
  profile: "प्रोफ़ाइल",
  signIn: "साइन इन",
  signOut: "साइन आउट",
  planMyTrip: "मेरी यात्रा प्लान करें",
  askTripMind: "TripMind से पूछें",
  heroTitle: "भारत के लिए आपका स्वायत्त ट्रैवल एजेंट",
  heroSub: "एक प्रॉम्प्ट दें और पूरा दिन-प्रतिदिन का प्लान पाएं — असली जगहें, असली खर्च।",
  goalPlaceholder: "कहाँ जाना है और आपके लिए क्या ज़रूरी है?",
  welcomeBack: "वापस स्वागत है",
  planning: "प्लानिंग",
  overview: "सारांश",
  itinerary: "यात्रा योजना",
  transport: "यातायात",
  stay: "ठहराव",
  food: "भोजन",
  packing: "पैकिंग",
  documents: "दस्तावेज़",
  currency: "मुद्रा",
  agentTrace: "एजेंट ट्रेस",
  confirmItinerary: "योजना पक्की करें",
  budget: "बजट",
  noTrips: "अभी कोई यात्रा नहीं है।",
};

const es: Dict = {
  home: "Inicio",
  myTrips: "Mis viajes",
  chat: "Chat",
  profile: "Perfil",
  signIn: "Iniciar sesión",
  signOut: "Cerrar sesión",
  planMyTrip: "Planear mi viaje",
  askTripMind: "Pregunta a TripMind",
  heroTitle: "Tu agente de viajes autónomo para India",
  heroSub: "Un mensaje y obtienes un itinerario día a día con lugares y costos reales.",
  goalPlaceholder: "¿A dónde quieres ir y qué te importa?",
  welcomeBack: "Bienvenido de nuevo",
  planning: "Planificando",
  overview: "Resumen",
  itinerary: "Itinerario",
  transport: "Transporte",
  stay: "Alojamiento",
  food: "Comida",
  packing: "Equipaje",
  documents: "Documentos",
  currency: "Moneda",
  agentTrace: "Traza del agente",
  confirmItinerary: "Confirmar itinerario",
  budget: "Presupuesto",
  noTrips: "Aún no hay viajes.",
};

const fr: Dict = {
  home: "Accueil",
  myTrips: "Mes voyages",
  chat: "Chat",
  profile: "Profil",
  signIn: "Se connecter",
  signOut: "Se déconnecter",
  planMyTrip: "Planifier mon voyage",
  askTripMind: "Demander à TripMind",
  heroTitle: "Votre agent de voyage autonome pour l'Inde",
  heroSub: "Un message suffit pour un itinéraire jour par jour avec lieux et coûts réels.",
  goalPlaceholder: "Où voulez-vous aller et qu'est-ce qui compte pour vous ?",
  welcomeBack: "Bon retour",
  planning: "Planification",
  overview: "Aperçu",
  itinerary: "Itinéraire",
  transport: "Transport",
  stay: "Hébergement",
  food: "Restauration",
  packing: "Bagages",
  documents: "Documents",
  currency: "Devise",
  agentTrace: "Trace de l'agent",
  confirmItinerary: "Confirmer l'itinéraire",
  budget: "Budget",
  noTrips: "Aucun voyage pour l'instant.",
};

const DICTS: Record<LangCode, Dict> = { en, hi, es, fr };

type I18nValue = { lang: LangCode; setLang: (l: LangCode) => void; t: (k: keyof typeof en | string) => string };

const I18nContext = createContext<I18nValue>({ lang: "en", setLang: () => {}, t: (k) => en[k] ?? String(k) });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("tripmind-lang") as LangCode | null;
    if (saved && saved in DICTS) setLangState(saved);
  }, []);

  const setLang = (l: LangCode) => {
    setLangState(l);
    window.localStorage.setItem("tripmind-lang", l);
  };

  const t = (k: string) => DICTS[lang][k] ?? en[k] ?? k;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
