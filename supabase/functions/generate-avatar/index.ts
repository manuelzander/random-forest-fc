import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { playerName, playerId } = await req.json()
    
    if (!playerName || !playerId) {
      throw new Error('Player name and ID are required')
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Generating avatar for player: ${playerName}`)

    // Generate a funny FIFA-style avatar prompt
    const prompt = `Create a hilarious FIFA-style video game avatar for a football player named "${playerName}". The image should be a cartoon/stylized portrait with exaggerated features, bright colors, and a fun, comedic style. Think FIFA Ultimate Team card vibes but extra funny and over-the-top. Make it look like a professional sports game character but with humorous proportions and expressions. High quality, colorful, and entertaining.`

    // Call Gemini API for image generation
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Gemini response:', JSON.stringify(data, null, 2))

    // Extract image data
    if (!data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
      throw new Error('No image data received from Gemini')
    }

    const imageData = data.candidates[0].content.parts[0].inlineData.data
    const mimeType = data.candidates[0].content.parts[0].inlineData.mimeType

    // Convert base64 to blob
    const imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0))

    // Upload to Supabase Storage
    const fileName = `default-avatar-${playerId}.${mimeType.split('/')[1]}`
    const filePath = `default/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, imageBuffer, {
        contentType: mimeType,
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Failed to upload avatar: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    console.log(`Avatar generated and uploaded: ${urlData.publicUrl}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        avatarUrl: urlData.publicUrl,
        playerId 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error generating avatar:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})