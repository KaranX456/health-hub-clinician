import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Activity, LogOut, Menu, Settings, Users, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/patients", label: "Patient roster", icon: Users },
  { to: "/settings", label: "Profile & settings", icon: Settings },
] as const;

export function AppShell({
  children,
  doctorName,
}: {
  children: ReactNode;
  doctorName?: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Activity className="size-5 text-sidebar-primary" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-sidebar-foreground">AI Health Companion</p>
            <p className="text-xs text-sidebar-foreground/60">Doctor dashboard</p>
          </div>
        </div>
        {nav}
        <div className="mt-auto border-t border-sidebar-border pt-4">
          <p className="px-3 pb-2 text-xs text-sidebar-foreground/60">
            {doctorName ?? "Clinician"}
          </p>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <span className="text-sm font-semibold">AI Health Companion</span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={signOut}>
            Sign out
          </Button>
        </header>
        <div
          className={cn(
            "border-b border-sidebar-border bg-sidebar p-3 md:hidden",
            open ? "block" : "hidden",
          )}
        >
          {nav}
        </div>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}