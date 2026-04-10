require('dotenv').config();
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_PASSWORD = process.env.SUPABASE_PASSWORD;

// Extract project ref from URL (e.g. https://[project_ref].supabase.co -> project_ref)
const match = SUPABASE_URL.match(/https:\/\/([a-zA-Z0-9]+)\.supabase\.co/);
const PROJECT_REF = match ? match[1] : null;

if (!PROJECT_REF) {
  console.error("Could not parse project reference from SUPABASE_URL");
  process.exit(1);
}

const connectionString = `postgresql://postgres:${encodeURIComponent(SUPABASE_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`;

async function setupSupabase() {
  console.log("Connecting to Supabase Database...");
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("✅ Database connected successfully.");

    const query = `
      -- 1. Table user_medias
      CREATE TABLE IF NOT EXISTS public.user_medias (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN ('image', 'video')),
          url TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      -- 2. Activer RLS
      ALTER TABLE public.user_medias ENABLE ROW LEVEL SECURITY;

      -- 3. Policies for user_medias
      DROP POLICY IF EXISTS "Users can view their own medias" ON public.user_medias;
      CREATE POLICY "Users can view their own medias" 
      ON public.user_medias FOR SELECT 
      USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can insert their own medias" ON public.user_medias;
      CREATE POLICY "Users can insert their own medias" 
      ON public.user_medias FOR INSERT 
      WITH CHECK (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can delete their own medias" ON public.user_medias;
      CREATE POLICY "Users can delete their own medias" 
      ON public.user_medias FOR DELETE 
      USING (auth.uid() = user_id);

      -- 4. Create storage bucket
      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('user-generations', 'user-generations', true)
      ON CONFLICT (id) DO UPDATE SET public = true;

      -- 5. Policies for storage
      DROP POLICY IF EXISTS "Media Storage Public View" ON storage.objects;
      CREATE POLICY "Media Storage Public View"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'user-generations');

      DROP POLICY IF EXISTS "Media Storage Insert" ON storage.objects;
      CREATE POLICY "Media Storage Insert"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'user-generations' AND auth.uid()::text = (storage.foldername(name))[1]);

      DROP POLICY IF EXISTS "Media Storage Delete" ON storage.objects;
      CREATE POLICY "Media Storage Delete"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'user-generations' AND auth.uid()::text = (storage.foldername(name))[1]);
    `;

    console.log("Executing schema setup...");
    await client.query(query);
    console.log("✅ Schema, tables, and storage buckets configured successfully!");

  } catch (error) {
    console.error("❌ Error setting up Supabase:", error.message);
  } finally {
    await client.end();
  }
}

setupSupabase();
