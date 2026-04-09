// ===========================
// PROPULSIA - Storage Module (Supabase)
// Upload direct vers Supabase Storage (sans Edge Function)
// ===========================

const StorageService = {

  // Helper pour récupérer l'utilisateur courant
  async getCurrentUser() {
    const supabaseClient = window.supabaseClient;
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
    const client = window.supabaseClient;
    if (!client) {
      throw new Error('Supabase client non initialisé.');
    }
    return client;
  },

  // Télécharger une image distante en blob
  async fetchImageAsBlob(imageUrl) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.blob();
    } catch (error) {
      console.error('Erreur téléchargement image:', error);
      throw new Error('Impossible de télécharger l\'image: ' + error.message);
    }
  },

  // Sauvegarder l'image générée directement dans Supabase Storage
  async saveGeneratedImage(generatedImageUrl, metadata) {
    console.log("=== SAUVEGARDE DIRECTE SUPABASE ===");
    console.log("URL de l'image:", generatedImageUrl);
    
    try {
      const supabaseClient = this.getClient();
      const user = await this.getCurrentUser();
      const userId = user?.id || 'anonymous';

      // 1. Télécharger l'image en blob
      console.log("⏳ Téléchargement de l'image...");
      const imageBlob = await this.fetchImageAsBlob(generatedImageUrl);
      console.log("✅ Image téléchargée, taille:", imageBlob.size);

      if (imageBlob.size === 0) {
        throw new Error('L\'image téléchargée est vide');
      }

      // 2. Générer le chemin du fichier
      const fileName = `generated_${Date.now()}.jpg`;
      const filePath = `${userId}/demo/${fileName}`;

      // 3. Upload vers Supabase Storage
      console.log("⏳ Upload vers Supabase Storage...");
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('user-generations')
        .upload(filePath, imageBlob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        throw new Error('Upload échoué: ' + uploadError.message);
      }

      console.log("✅ Upload réussi:", uploadData);

      // 4. Récupérer l'URL publique
      const { data: urlData } = supabaseClient.storage
        .from('user-generations')
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl || '';

      // 5. Sauvegarder les métadonnées en base
      const beforeImg = document.getElementById('beforeImage');
      const originalUrl = beforeImg ? beforeImg.src : '';

      const { data: dbData, error: dbError } = await supabaseClient
        .from('demo_generations')
        .insert([{
          user_id: user?.id || null,
          generated_url: publicUrl,
          generated_path: filePath,
          original_url: originalUrl,
          original_path: '',
          sector: metadata?.sector,
          style: metadata?.style,
          format: metadata?.format,
          duration: metadata?.duration
        }])
        .select();

      if (dbError) {
        console.warn('⚠️ Métadonnées non sauvegardées (image OK):', dbError.message);
      }

      console.log("✅ Sauvegarde complète !");
      showToast('💾', 'Image sauvegardée dans votre espace !');
      
      return { url: publicUrl, path: filePath, data: dbData };

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
  },

  // Sauvegarde automatique avec un blob déjà téléchargé (évite CORS)
  async autoSaveBlob(imageBlob, metadata) {
    try {
      const supabaseClient = this.getClient();
      const user = await this.getCurrentUser();
      const userId = user?.id || 'anonymous';

      if (!imageBlob || imageBlob.size === 0) {
        console.warn('Blob vide, sauvegarde ignorée');
        return null;
      }

      const fileName = `generated_${Date.now()}.jpg`;
      const filePath = `${userId}/demo/${fileName}`;

      console.log("⏳ Upload blob vers Supabase Storage...");
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('user-generations')
        .upload(filePath, imageBlob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw new Error('Upload échoué: ' + uploadError.message);

      const { data: urlData } = supabaseClient.storage
        .from('user-generations')
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl || '';

      // Sauvegarder les métadonnées en base
      const { data: dbData, error: dbError } = await supabaseClient
        .from('demo_generations')
        .insert([{
          user_id: user?.id || null,
          generated_url: publicUrl,
          generated_path: filePath,
          original_url: '',
          original_path: '',
          sector: metadata?.sector,
          style: metadata?.style,
          format: metadata?.format,
          duration: metadata?.duration
        }])
        .select();

      if (dbError) console.warn('⚠️ Métadonnées non sauvegardées:', dbError.message);

      console.log("✅ Blob sauvegardé dans Supabase !");
      showToast('💾', 'Image sauvegardée dans votre espace !');
      return { url: publicUrl, path: filePath, data: dbData };

    } catch (error) {
      console.warn('Auto-save blob échoué:', error.message);
      return null;
    }
  }
};
