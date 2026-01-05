import { useEffect, useState } from "react";
import type { Organization } from "../types/domain";
import supabase from "../lib/supabaseClient";
import { useSession } from "../context/SessionContext";

type OrgState = {
  organization: Organization | null;
  loading: boolean;
  error: string | null;
};

export const useCurrentOrganization = (): OrgState & { refresh: () => Promise<void> } => {
  const { session } = useSession();
  const [state, setState] = useState<OrgState>({
    organization: null,
    loading: true,
    error: null,
  });

  const fetchOrg = async () => {
    if (!session) {
      setState({ organization: null, loading: false, error: null });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, base_currency, created_at")
        .order("created_at", { ascending: true })
        .limit(1);

      if (error) {
        setState({ organization: null, loading: false, error: error.message });
        return;
      }

      setState({
        organization: data?.[0]
          ? {
              id: data[0].id,
              name: data[0].name,
              baseCurrency: data[0].base_currency,
              createdAt: data[0].created_at,
            }
          : null,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({
        organization: null,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao carregar organização",
      });
    }
  };

  useEffect(() => {
    void fetchOrg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  return { ...state, refresh: fetchOrg };
};
