-- ============================================
-- PROPULSIA - Setup SQL pour Supabase
-- ============================================

-- 1. Créer le bucket de stockage 'user-generations'
-- Note: À exécuter dans l'interface Supabase > Storage > New Bucket
-- Nom: user-generations
-- Public: true (pour permettre l'accès aux images)

-- 2. Créer la table pour les générations demo
CREATE TABLE IF NOT EXISTS demo_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    original_url TEXT NOT NULL,
    generated_url TEXT NOT NULL,
    original_path TEXT NOT NULL,
    generated_path TEXT, -- Peut être NULL si image externe (API KIE)
    sector TEXT,
    style TEXT,
    format TEXT,
    duration TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Activer RLS (Row Level Security)
ALTER TABLE demo_generations ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS
-- Permettre à tout le monde d'insérer (même anonyme)
CREATE POLICY "Allow anonymous insert" ON demo_generations
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Permettre aux utilisateurs de voir leurs propres générations
CREATE POLICY "Users can view own generations" ON demo_generations
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Permettre aux utilisateurs de supprimer leurs propres générations
CREATE POLICY "Users can delete own generations" ON demo_generations
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- 5. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_demo_generations_user_id ON demo_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_demo_generations_created_at ON demo_generations(created_at DESC);

-- ============================================
-- Configuration du Storage
-- ============================================

-- Politique pour permettre l'upload anonyme dans user-generations
CREATE POLICY "Allow anonymous upload" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'user-generations');

-- Politique pour permettre la lecture publique
CREATE POLICY "Allow public read" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'user-generations');

-- Politique pour permettre la suppression par le propriétaire
CREATE POLICY "Allow owner delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'user-generations' AND (storage.foldername(name))[1] = auth.uid()::text);
