import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession, useRoles } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { session } = useSession();
  const { isStaff } = useRoles(session?.user.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="brand-gradient flex size-9 items-center justify-center rounded-lg text-primary-foreground">
            <Activity className="size-5" />
          </span>
          <span className="font-display text-base font-semibold leading-tight">
            OncoTrack
            <span className="block text-[11px] font-normal uppercase tracking-[0.16em] text-muted-foreground">
              Tumour care records
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex">
          <HeaderLink to="/">Home</HeaderLink>
          <HeaderLink to="/examinations">Examinations</HeaderLink>
          <HeaderLink to="/protocols">Guidelines</HeaderLink>
          {session ? <HeaderLink to="/dashboard">Dashboard</HeaderLink> : null}
          {isStaff ? <HeaderLink to="/quality">Quality control</HeaderLink> : null}
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <span className="hidden max-w-[180px] truncate text-sm text-muted-foreground sm:inline">
                {session.user.email}
              </span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      activeProps={{ className: "bg-secondary text-foreground" }}
      activeOptions={{ exact: to === "/" }}
    >
      {children}
    </Link>
  );
}
