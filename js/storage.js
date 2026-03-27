// ===========================
// PROPULSIA - Storage Module (Supabase)
// ===========================

const StorageService = {
  // Helper pour récupérer l'utilisateur courant
  async getCurrentUser() {
    const supabaseClient = window.supabase;
    if (!supabaseClient) return null;
    
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Sauvegarder UNIQUEMENT l'image générée par KIE via Edge Function
  async saveGeneratedImage(generatedImageUrl, metadata) {
    console.log("=== DÉBUT SAUVEGARDE IMAGE GÉNÉRÉE ===");
    console.log("URL image générée:", generatedImageUrl);
    
    try {
      const supabaseClient = window.supabase;
      if (!supabaseClient) {
        throw new Error('Supabase client not initialized');
      }

      const user = await this.getCurrentUser();
      
      if (!generatedImageUrl) {
        throw new Error("NO GENERATED IMAGE URL");
      }

      // Appeler l'Edge Function pour télécharger et stocker l'image
      console.log("STEP 1: CALLING EDGE FUNCTION");
      
      const { data, error } = await supabaseClient.functions.invoke('download-and-store', {
        body: {
          imageUrl: generatedImageUrl,
          userId: user?.id,
          metadata: metadata
        }
      });

      if (error) {
        throw new Error("EDGE FUNCTION ERROR: " + error.message);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || "Unknown error from edge function");
      }

      console.log("STEP 2: UPLOAD SUCCESS", data.url);
      console.log("=== FIN SAUVEGARDE ===");
      
      showToast('💾', 'Image sauvegardée dans votre galerie !');
      return data.data;
      
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      showToast('⚠️', 'Erreur: ' + error.message);
      throw error;
    }
  }
};
