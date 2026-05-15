import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://covnmlolzupnaepqydbe.supabase.co";
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_VRkXxjLc54QMurO8v9lvSg_KRg0NNQW";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
