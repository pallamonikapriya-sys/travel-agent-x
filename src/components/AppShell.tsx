import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, LANGUAGES, type LangCode } from "@/lib/i18n";
import logo from "@/assets/tripmind-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Home, Luggage, MessageCircle, User } from "lucide-react";
import ChatBubble from "@/components/ChatBubble";
import { useQueryClient } from "@tanstack/react-query";

const navItems = [
  { to: "/", key: "home", icon: Home },
  { to: "/trips", key: "myTrips", icon: Luggage },
  { to: "/profile", key: "profile", icon: User },
] as const;

export default function AppShell({ children, tripId }: { children: ReactNode; tripId?: string }) {
  const { t, lang, setLang } = useI18n();
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo.url} alt="TripMind" className="h-7 w-auto" />
          </Link>
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: "rounded-xl px-3 py-2 text-sm font-semibold bg-accent text-accent-foreground" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">{LANGUAGES.find((l) => l.code === lang)?.label}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {LANGUAGES.map((l) => (
                  <DropdownMenuItem key={l.code} onClick={() => setLang(l.code as LangCode)}>
                    {l.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {email ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="rounded-xl">
                    {email.split("@")[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>{t("profile")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>{t("signOut")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" className="rounded-xl" onClick={() => navigate({ to: "/auth" })}>
                {t("signIn")}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:pb-12">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-card md:hidden">
        {navItems.map((item) => (
          <Link key={item.to} to={item.to} className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted-foreground" activeProps={{ className: "flex flex-1 flex-col items-center gap-1 py-2 text-xs text-primary font-semibold" }} activeOptions={{ exact: item.to === "/" }}>
            <item.icon className="h-5 w-5" />
            {t(item.key)}
          </Link>
        ))}
        <span className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted-foreground">
          <MessageCircle className="h-5 w-5" />
          {t("chat")}
        </span>
      </nav>

      <ChatBubble tripId={tripId} />
    </div>
  );
}
