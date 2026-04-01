// Edge Function: download-and-store
// Télécharge une image depuis une URL et la stocke dans Supabase Storage

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Get request body
    const { imageUrl, userId, metadata } = await req.json()

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'No image URL provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Downloading image from:', imageUrl)

    // Download image from URL (no CORS restrictions on server)
    const imageResponse = await fetch(imageUrl)
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`)
    }

    const imageBlob = await imageResponse.blob()
    console.log('Image downloaded, size:', imageBlob.size)

    if (imageBlob.size === 0) {
      throw new Error('Downloaded image is empty')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generate file path
    const fileName = `generated_${Date.now()}.jpg`
    const filePath = userId ? `${userId}/demo/${fileName}` : `anonymous/demo/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseClient.storage
      .from('user-generations')
      .upload(filePath, imageBlob, {
        contentType: imageBlob.type || 'image/jpeg',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('user-generations')
      .getPublicUrl(filePath)

    // Save to database
    const { data: dbData, error: dbError } = await supabaseClient
      .from('demo_generations')
      .insert([{
        user_id: userId || null,
        generated_url: urlData.publicUrl,
        generated_path: filePath,
        original_url: metadata?.originalUrl || imageUrl,
        original_path: '',
        sector: metadata?.sector,
        style: metadata?.style,
        format: metadata?.format,
        duration: metadata?.duration,
        created_at: new Date().toISOString()
      }])
      .select()

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: dbData[0],
        url: urlData.publicUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
