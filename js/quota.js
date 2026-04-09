// ===========================
// PROPULSIA - Quota Management Module
// Gestion des limites d'abonnement
// ===========================

const QuotaService = {

  // Définition des plans
  PLANS: {
    discover: {
      name: 'Découverte',
      images_per_month: 5,
      videos_per_month: 1,
      watermark: true
    },
    pro: {
      name: 'Professionnel',
      images_per_month: Infinity,
      videos_per_month: 15,
      watermark: false
    },
    enterprise: {
      name: 'Entreprise',
      images_per_month: Infinity,
      videos_per_month: Infinity,
      watermark: false
    }
  },

  // Récupère le plan de l'utilisateur connecté
  async getUserPlan() {
    if (!window.supabaseClient) return 'discover';
    try {
      const { data } = await window.supabaseClient.auth.getSession();
      if (!data?.session?.user) return 'discover';
      const meta = data.session.user.user_metadata || {};
      const role = meta.role || 'prospect';
      const plan = meta.plan || 'discover';
      // Les admins ont accès entreprise
      if (role === 'admin') return 'enterprise';
      if (role === 'subscriber' || plan === 'pro') return 'pro';
      if (plan === 'enterprise') return 'enterprise';
      return 'discover';
    } catch (e) {
      return 'discover';
    }
  },

  // Clé de mois en cours (format: "2026-04")
  _getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },

  // Récupère les compteurs du mois en cours depuis user_metadata
  async _getUsage() {
    if (!window.supabaseClient) return { images: 0, videos: 0, month: this._getCurrentMonthKey() };
    try {
      const { data } = await window.supabaseClient.auth.getSession();
      if (!data?.session?.user) return { images: 0, videos: 0, month: this._getCurrentMonthKey() };
      const meta = data.session.user.user_metadata || {};
      const usage = meta.usage || {};
      const currentMonth = this._getCurrentMonthKey();
      // Reset si on est dans un nouveau mois
      if (usage.month !== currentMonth) {
        return { images: 0, videos: 0, month: currentMonth };
      }
      return {
        images: usage.images || 0,
        videos: usage.videos || 0,
        month: currentMonth
      };
    } catch (e) {
      return { images: 0, videos: 0, month: this._getCurrentMonthKey() };
    }
  },

  // Sauvegarde les compteurs dans user_metadata
  async _saveUsage(usage) {
    if (!window.supabaseClient) return;
    try {
      await window.supabaseClient.auth.updateUser({
        data: { usage: usage }
      });
    } catch (e) {
      console.error('Erreur sauvegarde usage:', e.message);
    }
  },

  // Vérifie si l'utilisateur peut générer une image
  async canGenerateImage() {
    const plan = await this.getUserPlan();
    const limits = this.PLANS[plan] || this.PLANS.discover;
    if (limits.images_per_month === Infinity) return { allowed: true, plan, remaining: '∞' };
    const usage = await this._getUsage();
    const remaining = limits.images_per_month - usage.images;
    return {
      allowed: remaining > 0,
      plan,
      remaining: remaining,
      used: usage.images,
      limit: limits.images_per_month
    };
  },

  // Vérifie si l'utilisateur peut générer une vidéo
  async canGenerateVideo() {
    const plan = await this.getUserPlan();
    const limits = this.PLANS[plan] || this.PLANS.discover;
    if (limits.videos_per_month === Infinity) return { allowed: true, plan, remaining: '∞' };
    const usage = await this._getUsage();
    const remaining = limits.videos_per_month - usage.videos;
    return {
      allowed: remaining > 0,
      plan,
      remaining: remaining,
      used: usage.videos,
      limit: limits.videos_per_month
    };
  },

  // Incrémente le compteur d'images
  async recordImageGeneration() {
    const usage = await this._getUsage();
    usage.images = (usage.images || 0) + 1;
    await this._saveUsage(usage);
    return usage;
  },

  // Incrémente le compteur de vidéos
  async recordVideoGeneration() {
    const usage = await this._getUsage();
    usage.videos = (usage.videos || 0) + 1;
    await this._saveUsage(usage);
    return usage;
  },

  // Vérifie si le filigrane doit être appliqué
  async shouldApplyWatermark() {
    const plan = await this.getUserPlan();
    const limits = this.PLANS[plan] || this.PLANS.discover;
    return limits.watermark;
  }
};
