import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import supabase from "../lib/supabaseClient";

type BootstrapState = {
  loading: boolean;
  hasOrg: boolean;
  hasName: boolean;
  error: string | null;
};

export const useOnboardingBootstrap = (session: Session | null): BootstrapState => {
  const [state, setState] = useState<BootstrapState>({
    loading: true,
    hasOrg: false,
    hasName: false,
    error: null,
  });

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!session) {
        if (!active) return;
        setState({ loading: false, hasOrg: false, hasName: false, error: null });
        return;
      }

      try {
        const { data, error } = await supabase.from("organizations").select("id").limit(1);
        if (!active) return;

        if (error) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error.message,
            hasOrg: false,
            hasName: Boolean(session.user.user_metadata?.name),
          }));
          return;
        }

        setState({
          loading: false,
          hasOrg: Boolean(data && data.length > 0),
          hasName: Boolean(session.user.user_metadata?.name),
          error: null,
        });
      } catch (err) {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Falha ao carregar dados",
          hasOrg: false,
          hasName: Boolean(session.user.user_metadata?.name),
        }));
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [session]);

  return state;
};
