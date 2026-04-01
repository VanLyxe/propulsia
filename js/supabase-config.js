// ===========================
// PROPULSIA - Supabase Configuration
// ===========================

const SUPABASE_URL = 'https://xskiuisvbfzsyjheogup.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhza2l1aXN2YmZ6c3lqaGVvZ3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzMxMDgsImV4cCI6MjA5MDEwOTEwOH0.vJfAGmHzU3cPYmd-0mWkKj0dX4hgvzw9GpiKSCiscsE';

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
