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
      prompt = `Transform this image into a borderless retro European football player portrait.

      CRITICAL REQUIREMENTS - NO EXCEPTIONS:
      - Create a CIRCULAR portrait that seamlessly blends into pure white background
      - ABSOLUTELY ZERO borders, outlines, frames, or edge lines of ANY KIND
      - NO black lines, white lines, colored lines, or decorative borders ANYWHERE
      - The portrait edges must fade/blend naturally into the white background
      - Portrait should look like it's floating on white space with no visible boundary
      
      STYLE & COMPOSITION:
      - Retro comic illustration style with clean artwork
      - Person facing camera directly with friendly expression  
      - Head and shoulders soccer player portrait (face forward view)
      - ${clubInfo} with vintage 70s/80s styling (thick collar, simple classic cut)
      - NO text, names, or numbers visible anywhere
      - Maintain person's unique characteristics while adding soccer theme
      - Professional retro soccer card aesthetic with smooth clean artwork
      
      BACKGROUND & EDGES:
      - Pure white (#FFFFFF) background that extends to all edges
      - Portrait must seamlessly transition into white background
      - NO visible separation between portrait and background
      - Image should appear borderless and frameless`
      
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
      // Random generation - use the actual player name
      prompt = `Create a borderless retro soccer player portrait for ${playerName}.

      CRITICAL REQUIREMENTS - NO EXCEPTIONS:
      - Generate a CIRCULAR portrait that seamlessly blends into pure white background  
      - ABSOLUTELY ZERO borders, outlines, frames, or edge lines of ANY KIND
      - NO black lines, white lines, colored lines, or decorative borders ANYWHERE
      - The portrait edges must fade/blend naturally into the white background
      - Portrait should look like it's floating on white space with no visible boundary
      
      POSE & JERSEY:
      - Player facing away (back view) but looking over shoulder at camera with friendly expression
      - Show back of vintage 70s/80s soccer jersey with:
        * "${playerName}" printed on back in capital letters
        * Random jersey number (1-99) below the name
        * ${clubInfo} with retro styling
      
      UNIQUE FEATURES (Seed: ${randomSeed}):
      - Ethnicity: ${randomEthnicity}
      - Age: ${randomAge}  
      - Hair: ${randomHair}
      - Facial hair: ${randomFacialHair}
      - ${clubInfo} with vintage styling
      
      STYLE & BACKGROUND:
      - Clean retro comic illustration with smooth artwork
      - Pure white (#FFFFFF) background extending to all edges
      - Portrait must seamlessly transition into white background
      - NO visible separation between portrait and background
      - Image should appear completely borderless and frameless`
      
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
    
    // Check for prohibited content or safety filter blocks
    if (data.candidates?.[0]?.finishReason === 'PROHIBITED_CONTENT') {
      console.log('Content was blocked by safety filters, trying with more generic prompt...')
      
      // Fallback with very generic prompt
      const fallbackPrompt = `Create a borderless cartoon soccer player portrait in retro 70s style.

      CRITICAL REQUIREMENTS - NO EXCEPTIONS:
      - Generate a CIRCULAR portrait that seamlessly blends into pure white background
      - ABSOLUTELY ZERO borders, outlines, frames, or edge lines of ANY KIND  
      - NO black lines, white lines, colored lines, or decorative borders ANYWHERE
      - The portrait edges must fade/blend naturally into the white background
      - Portrait should look like it's floating on white space with no visible boundary
      
      STYLE & COMPOSITION:
      - Clean cartoon illustration with friendly player looking at camera
      - Vintage soccer jersey with random team colors and simple retro design
      - Pure white background extending to all edges with no text or names
      - Colorful fun cartoon style suitable for sports avatar
      - Portrait must seamlessly transition into white background with NO visible separation`
      
      const fallbackBody = {
        contents: [{
          parts: [{ text: fallbackPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ]
      }
      
      const fallbackResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fallbackBody),
      })
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        
        // Try to extract image from fallback
        if (fallbackData.candidates?.[0]?.content?.parts) {
          for (const part of fallbackData.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              const imageBuffer = Uint8Array.from(atob(part.inlineData.data), c => c.charCodeAt(0))
              
              // Upload fallback image
              const timestamp = Date.now()
              const fileName = `avatar-${playerId}-${timestamp}.png`
              const filePath = `default/${fileName}`

              const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, imageBuffer, {
                  contentType: 'image/png',
                  upsert: true
                })

              if (!uploadError) {
                const { data: urlData } = supabase.storage
                  .from('avatars')
                  .getPublicUrl(filePath)

                console.log(`Fallback avatar generated: ${urlData.publicUrl}`)
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
              }
            }
          }
        }
      }
      
      throw new Error('Content blocked by safety filters and fallback generation failed')
    }

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