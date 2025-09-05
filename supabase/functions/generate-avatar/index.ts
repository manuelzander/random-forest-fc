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
    const { playerName, playerId, imageToImage, baseImageData } = await req.json()
    
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

    console.log(`Generating avatar for player: ${playerName}`, imageToImage ? 'with base image' : 'random')

    // Create prompt based on whether it's image-to-image or random generation
    let prompt
    let requestBody: any = {
      contents: [{
        parts: []
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
    }

    if (imageToImage && baseImageData) {
      // Image-to-image generation
      prompt = `Transform this image into a hilarious soccer (European football) comic-style portrait for player "${playerName}".
      
      Keep the facial features and general appearance from the original image but:
      - Transform into funny cartoon/comic book illustration style with exaggerated comedic features
      - Make the face amusing with comedic expressions (goofy smile, crossed eyes, big nose, funny eyebrows, etc.)
      - Show the person in soccer gear with jersey back visible
      - Jersey should have "${playerName}" printed on the back with a random number (1-99)
      - Person should be looking over their shoulder at the camera with a hilarious expression
      - Background MUST be pure white (#FFFFFF) - absolutely no other colors or patterns
      - Maintain the person's unique characteristics while making it football-themed and genuinely funny
      - Make it entertaining and amusing while being respectful`
      
      requestBody.contents[0].parts = [
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: baseImageData
          }
        }
      ]
    } else {
      // Random generation (existing logic)
      prompt = `Create a realistic soccer (European football) comic-style portrait for a player named "${playerName}".
    
    POSE: Player facing away from camera (back view) but looking over their shoulder directly at the camera with a HILARIOUS and funny expression.
    
    JERSEY BACK: Show the back of the soccer jersey clearly with:
    - Player name "${playerName}" printed on the back in capital letters
    - Random jersey number (1-99) below the name
    - Make the text clearly readable and professional looking
    
    FUNNY FEATURES - Make this character look COMPLETELY DIFFERENT and AMUSING:
    - Face shape: exaggerated and comedic (round, oval, square, rectangular, or diamond-shaped)
    - Ethnicity: diverse representation (European, African, Asian, Latin American, Middle Eastern, mixed heritage)
    - Age appearance: young (18-22), mid-career (23-28), or veteran (29-35)
    - Hair: completely different and funny styles (wild curly, ridiculous haircuts, funny colors, bald with funny patterns, etc.)
    - Facial hair: comedic styles (massive mustache, tiny beard, uneven stubble, funny goatee shapes)
    - Eyes: make them funny (crossed eyes, one bigger than the other, googly eyes, squinting, winking, etc.)
    - Nose: exaggerated and amusing (big nose, tiny nose, crooked nose, button nose)
    - Mouth: funny expressions (goofy grin, buck teeth, gap teeth, lopsided smile, tongue sticking out)
    - Ears: can be big, small, or sticking out for comedic effect
    - Facial expressions: hilarious and entertaining (goofy smile, determined squint, cheeky wink, surprised look, etc.)
    - Skin tone: natural variety across all ethnicities
    - Jersey colors: randomize team colors and styles
    
    Style: Funny cartoon/comic book illustration with exaggerated features for maximum humor.
    Background: PURE WHITE background (#FFFFFF) - absolutely no other colors or patterns.
    
    Make this avatar genuinely funny and entertaining while being respectful!
    
    Generate a UNIQUE individual looking back over shoulder with jersey back visible!`
      
      requestBody.contents[0].parts = [{ text: prompt }]
    }

    // Use Gemini API for realistic image generation
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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

    // Upload to Supabase Storage with unique filename to avoid caching issues
    const timestamp = Date.now()
    const fileName = `avatar-${playerId}-${timestamp}.png`
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