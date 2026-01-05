import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import { useSession } from "../context/SessionContext";

type ProfileState = {
  name: string;
  email: string;
  loading: boolean;
  error: string | null;
};

export const useProfile = (): ProfileState & { updateName: (name: string) => Promise<void> } => {
  const { session } = useSession();
  const [state, setState] = useState<ProfileState>({
    name: "",
    email: "",
    loading: true,
    error: null,
  });

  const load = async () => {
    if (!session) {
      setState({ name: "", email: "", loading: false, error: null });
      return;
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      setState({
        name: "",
        email: "",
        loading: false,
        error: error?.message ?? "Não foi possível carregar o perfil",
      });
      return;
    }
    setState({
      name: data.user.user_metadata?.name ?? "",
      email: data.user.email ?? "",
      loading: false,
      error: null,
    });
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  const updateName = async (name: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.updateUser({ data: { name } });
    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }));
      return;
    }
    await load();
  };

  return { ...state, updateName };
};
