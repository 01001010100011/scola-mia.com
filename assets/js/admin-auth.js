import { supabase } from "./supabase-client.js?v=20260224e";

export async function ensureCurrentUserIsAdmin() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const userId = authData?.user?.id;
  if (!userId) return false;

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id,role,active")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data && data.role === "admin");
}
