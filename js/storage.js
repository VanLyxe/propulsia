// ===========================
// PROPULSIA - Storage Module (Supabase)
// Sauvegarde via Edge Function (Contourne CORS et stocke le fichier dans Storage)
// ===========================

const StorageService = {

  // Helper pour récupérer l'utilisateur courant
  async getCurrentUser() {
    const supabaseClient = window.supabaseClient || window.supabase;
    if (!supabaseClient || !supabaseClient.auth) return null;
    
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Récupérer le client Supabase initialisé
  getClient() {
    const client = window.supabaseClient || window.supabase;
    if (!client || typeof client.functions === 'undefined') {
      throw new Error('Supabase client non initialisé correctement.');
    }
    return client;
  },

  // Sauvegarder l'image générée en appelant l'Edge Function Supabase
  async saveGeneratedImage(generatedImageUrl, metadata) {
    console.log("=== SAUVEGARDE VIA EDGE FUNCTION ===");
    console.log("URL de l'image à télécharger:", generatedImageUrl);
    
    try {
      const supabaseClient = this.getClient();
      const user = await this.getCurrentUser();
      
      const beforeImg = document.getElementById('beforeImage');
      const originalUrl = beforeImg ? beforeImg.src : '';

      // Appel de l'Edge Function 'download-and-store' qui tourne sur les serveurs Supabase
      // Elle télécharge l'image générée sans problème de CORS et la met dans le bucket !
      const { data, error } = await supabaseClient.functions.invoke('download-and-store', {
        body: {
          imageUrl: generatedImageUrl,
          userId: user?.id || null,
          metadata: {
            ...metadata,
            originalUrl: originalUrl
          }
        }
      });

      if (error) {
        throw new Error('Erreur exécution Edge Function: ' + error.message);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Erreur inconnue renvoyée par la fonction');
      }

      console.log("✅ Sauvegarde dans le Storage réussie:", data);
      showToast('💾', 'Fichier image sauvegardé dans Supabase !');
      
      return data;

    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      showToast('⚠️', 'Erreur sauvegarde: ' + error.message);
      throw error;
    }
  },

  // Sauvegarde automatique (non-bloquante)
  async autoSave(generatedImageUrl, metadata) {
    try {
      return await this.saveGeneratedImage(generatedImageUrl, metadata);
    } catch (error) {
      console.warn('Auto-save échoué:', error.message);
      return null;
    }
  }
};
