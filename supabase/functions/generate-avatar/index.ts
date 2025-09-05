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

    // Create a detailed, realistic FIFA-style avatar prompt
    const prompt = `Create a realistic FIFA Ultimate Team style player card portrait for "${playerName}". 
    Style: Professional FIFA video game character portrait, high quality 3D render style like FIFA 23/24 player cards.
    
    Details:
    - Male football/soccer player portrait, head and shoulders view
    - Slightly cartoonish but realistic proportions (FIFA game style, not photorealistic)
    - Bright, vibrant colors and professional lighting
    - Clean background with subtle gradient (blue to white or green to white)
    - Player should look confident and athletic
    - Modern football jersey/kit visible at bottom
    - High contrast, sharp details, video game quality rendering
    - FIFA Ultimate Team card aesthetic
    - Colorful, engaging, professional sports game character design
    
    Make it look exactly like a FIFA Ultimate Team player card portrait - clean, professional, video game style but not too cartoonish.`

    // Use Gemini API for realistic image generation
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`, {
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
          temperature: 0.4,
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
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Gemini response received, checking for image data...')

    // Extract image data from Gemini response
    let imageData = null
    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          imageData = part.inlineData.data
          console.log('Found image data in response')
          break
        }
      }
    }

    if (!imageData) {
      console.error('No image data found in response:', JSON.stringify(data, null, 2))
      throw new Error('No image data received from Gemini')
    }

    // Convert base64 to buffer
    const imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0))

    // Upload to Supabase Storage
    const fileName = `default-avatar-${playerId}.png`
    const filePath = `default/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
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