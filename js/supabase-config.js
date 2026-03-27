// ===========================
// PROPULSIA - Supabase Configuration
// ===========================

const SUPABASE_URL = 'https://xskiuisvbfzsyjheogup.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhza2l1aXN2YmZ6c3lqaGVvZ3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzMxMDgsImV4cCI6MjA5MDEwOTEwOH0.vJfAGmHzU3cPYmd-0mWkKj0dX4hgvzw9GpiKSCiscsE';

// Initialiser Supabase immédiatement si possible, sinon attendre le DOM
function initSupabase() {
  try {
    // Vérifier si supabase est disponible (chargé via CDN)
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      // Créer le client
      window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      // Exposer comme variable globale 'supabase' pour compatibilité
      window.supabase = window.supabaseClient;
      console.log('⚡ Supabase client initialized');
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
