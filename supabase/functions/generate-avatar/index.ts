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
    const { playerName, playerId, imageToImage, baseImageData, favoriteClub } = await req.json()
    
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

    console.log(`Generating avatar for player: ${playerName}`, imageToImage ? 'with base image' : 'random', favoriteClub ? `for ${favoriteClub}` : '')

    // Add randomization elements for unique avatars
    const randomSeed = Math.floor(Math.random() * 1000000);
    const ethnicities = ['European', 'African', 'Asian', 'Latin American', 'Middle Eastern', 'Mixed heritage', 'Scandinavian', 'Mediterranean', 'Caribbean'];
    const randomEthnicity = ethnicities[Math.floor(Math.random() * ethnicities.length)];
    
    const hairStyles = ['buzz cut', 'curly afro', 'straight hair', 'wavy hair', 'completely bald', 'long flowing hair', 'short spiky hair', 'dreadlocks', 'mohawk', 'crew cut', 'shaggy hair', 'receding hairline'];
    const randomHair = hairStyles[Math.floor(Math.random() * hairStyles.length)];
    
    const facialHairOptions = ['clean shaven', 'thick mustache', 'full beard', 'goatee', 'stubble', 'soul patch', 'handlebar mustache', 'chinstrap beard'];
    const randomFacialHair = facialHairOptions[Math.floor(Math.random() * facialHairOptions.length)];
    
    const ageGroups = ['young (18-22)', 'mid-career (23-28)', 'veteran (29-35)'];
    const randomAge = ageGroups[Math.floor(Math.random() * ageGroups.length)];

    // Create club-specific jersey information
    const clubInfo = favoriteClub ? `wearing a ${favoriteClub} jersey with team colors and style` : 'wearing a soccer jersey with random team colors'
    let prompt
    let requestBody: any = {
      contents: [{
        parts: []
      }],
      generationConfig: {
        temperature: 0.9, // Increase randomness
        topK: 40,
        topP: 0.95,
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
      // Image-to-image generation - face forward portrait
      prompt = `Transform this image into a retro European football (soccer) player portrait.
      
      Create a front-facing SQUARE ASPECT RATIO (1:1) cartoon portrait with:
      - Transform into retro comic style with clean illustration
      - Person looking directly at camera with friendly expression
      - Keep it as a head and shoulders portrait of a soccer/football player (face forward, not back view)
      - ${clubInfo} with RETRO 70s/80s vintage soccer jersey styling (thick collar, simple design, classic cut)
      - NO NAME or NUMBER visible anywhere on the jersey or image
      - Background MUST be pure white (#FFFFFF) with NO borders, frames, or other elements
      - IMPORTANT: Generate as perfect SQUARE format (1:1 aspect ratio) for circular avatar display
      - Maintain the person's unique characteristics while making it soccer/football-themed
      - Professional retro soccer card aesthetic with clean lines
      - Focus on the face and expression with vintage soccer aesthetic`
      
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
      prompt = `Create a retro European football (soccer) comic-style portrait for a player named "${playerName}".
    
    IMPORTANT: Generate as perfect SQUARE format (1:1 aspect ratio) for circular avatar display.
    
    POSE: Player facing away from camera (back view) but looking over their shoulder directly at the camera with a friendly expression.
    
    RETRO JERSEY BACK: Show the back of a vintage 70s/80s style soccer jersey clearly with:
    - Player name "${playerName}" printed on the back in capital letters
    - Random jersey number (1-99) below the name  
    - ${clubInfo} with retro styling (thick collar, classic cut, vintage color schemes)
    - Make the text clearly readable and professional looking with retro font style
    
    UNIQUE FEATURES - Make this character look COMPLETELY DIFFERENT from any previous generation (Seed: ${randomSeed}):
    - Ethnicity: ${randomEthnicity} - make this very distinct
    - Age appearance: ${randomAge} - reflect this clearly in facial features
    - Hair: ${randomHair} - make this the dominant hair characteristic
    - Facial hair: ${randomFacialHair} - make this prominent and defining
    - Face shape: randomly choose between round, oval, square, rectangular, diamond-shaped, heart-shaped, or triangular
    - Eyes: vary dramatically (small/large, close/wide-set, different colors, different shapes)
    - Nose: vary significantly (button, roman, aquiline, flat, wide, narrow, straight)
    - Mouth: vary greatly (thin/thick lips, wide/narrow mouth, different smile styles)
    - Facial expressions: choose friendly expressions (warm smile, confident look, determined gaze)
    - Skin tone: natural variety matching the chosen ethnicity
    - Jersey: ${clubInfo} with vintage retro 70s/80s soccer styling
    - Body build: vary between slim, athletic, stocky, tall, short proportions
    
    CRITICAL: This must be a COMPLETELY NEW and UNIQUE character. Do not repeat any previous designs or characteristics.
    
    Style: Clean retro comic book illustration with bold outlines and vibrant colors, professional 70s/80s soccer card aesthetic.
    Background: PURE WHITE background (#FFFFFF) with NO borders, frames, or other decorative elements - only solid white.
    Format: SQUARE ASPECT RATIO (1:1) for perfect circular avatar display.
    
    Generate a totally unique individual that has never been created before! Use the seed ${randomSeed} to ensure complete uniqueness.
    
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