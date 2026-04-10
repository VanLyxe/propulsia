// ===========================
// PROPULSIA - Supabase Configuration
// ===========================

const SUPABASE_URL = window.ENV?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || '';
// Initialiser Supabase - stocke le client dans window.supabaseClient
// IMPORTANT: ne PAS écraser window.supabase qui est la lib CDN
function initSupabase() {
  try {
    // La lib CDN expose window.supabase.createClient
    const supabaseLib = window.supabase;
    
    if (typeof supabaseLib !== 'undefined' && supabaseLib.createClient) {
      // Créer le client et le stocker séparément
      window.supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('⚡ Supabase client initialized');
      console.log('📦 URL:', SUPABASE_URL);
      return true;
    } else {
      console.error('Supabase library not loaded. Check CDN script.');
      return false;
    }
  } catch (error) {
    console.error('Error initializing Supabase:', error);
    return false;
  }
}

// Essayer d'initialiser immédiatement
if (!initSupabase()) {
  // Si échec, attendre que le DOM soit chargé
  document.addEventListener('DOMContentLoaded', initSupabase);
}
