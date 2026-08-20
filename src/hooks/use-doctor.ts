import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Doctor } from "@/lib/db";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading, userId: session?.user.id ?? null };
}

export function useDoctorProfile(userId: string | null) {
  return useQuery({
    queryKey: ["doctor", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Doctor | null> => {
      const { data, error } = await supabase
        .from("doctors")
        .select("id, full_name, license_number, clinician_verified_at")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Doctor | null;
    },
  });
}