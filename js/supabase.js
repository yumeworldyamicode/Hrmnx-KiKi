const SUPABASE_URL = "https://bftgnubawqwvpbqkldpm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Uoky_Y8iSnzCu0wOa5_y-w_McGOJcJ4";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

// Expose the shared client for scripts that access it through window.
window.supabaseClient = supabaseClient;
