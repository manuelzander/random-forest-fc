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

    // Generate a simple but fun SVG avatar as a fallback
    // This creates a colorful, cartoon-style avatar
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB347', '#87CEEB'];
    const backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    const hairColor = colors[Math.floor(Math.random() * colors.length)];
    const shirtColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Create a fun SVG avatar with exaggerated features
    const avatarSvg = `
    <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${shirtColor};stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="300" height="300" fill="url(#bg)"/>
      
      <!-- Head (oversized and round) -->
      <circle cx="150" cy="120" r="80" fill="#FDBCB4" stroke="#E67E68" stroke-width="3"/>
      
      <!-- Hair (wild and crazy) -->
      <path d="M70 70 Q80 40 100 50 Q120 30 140 45 Q160 25 180 40 Q200 30 220 50 Q210 60 200 70 Q190 50 180 60 Q170 45 160 55 Q150 40 140 50 Q130 35 120 45 Q110 40 100 50 Q90 45 80 55 Q75 50 70 70 Z" fill="${hairColor}"/>
      
      <!-- Eyes (googly and crossed) -->
      <ellipse cx="125" cy="100" rx="15" ry="20" fill="white"/>
      <ellipse cx="175" cy="100" rx="15" ry="20" fill="white"/>
      <circle cx="130" cy="105" r="8" fill="black"/>
      <circle cx="170" cy="95" r="8" fill="black"/>
      <circle cx="132" cy="103" r="3" fill="white"/>
      <circle cx="168" cy="93" r="3" fill="white"/>
      
      <!-- Eyebrows (thick and raised) -->
      <path d="M110 85 Q125 75 140 80" stroke="#8B4513" stroke-width="4" fill="none"/>
      <path d="M160 75 Q175 70 190 80" stroke="#8B4513" stroke-width="4" fill="none"/>
      
      <!-- Nose (large and bulbous) -->
      <ellipse cx="150" cy="115" rx="8" ry="12" fill="#F4A460"/>
      <circle cx="150" cy="120" r="3" fill="#CD853F"/>
      
      <!-- Mouth (wide goofy grin) -->
      <path d="M120 140 Q150 160 180 140" stroke="#8B0000" stroke-width="4" fill="none"/>
      <rect x="125" y="145" width="8" height="12" fill="white" rx="2"/>
      <rect x="135" y="148" width="6" height="9" fill="white" rx="1"/>
      <rect x="143" y="147" width="7" height="10" fill="white" rx="1"/>
      <rect x="152" y="148" width="6" height="9" fill="white" rx="1"/>
      <rect x="160" y="147" width="7" height="10" fill="white" rx="1"/>
      <rect x="169" y="145" width="8" height="12" fill="white" rx="2"/>
      
      <!-- Body/Jersey -->
      <rect x="100" y="200" width="100" height="100" fill="${shirtColor}" rx="10"/>
      
      <!-- Jersey number -->
      <text x="150" y="240" font-family="Arial Black" font-size="24" fill="white" text-anchor="middle" font-weight="bold">${Math.floor(Math.random() * 99) + 1}</text>
      
      <!-- Arms (tiny compared to head) -->
      <ellipse cx="90" cy="220" rx="20" ry="40" fill="#FDBCB4"/>
      <ellipse cx="210" cy="220" rx="20" ry="40" fill="#FDBCB4"/>
      
      <!-- Player name -->
      <text x="150" y="290" font-family="Arial Black" font-size="16" fill="white" text-anchor="middle" font-weight="bold">${playerName.toUpperCase()}</text>
    </svg>`;

    // Convert SVG to PNG using a simple method
    const svgBuffer = new TextEncoder().encode(avatarSvg);
    
    // Upload SVG directly (will be displayed as image)
    const fileName = `default-avatar-${playerId}.svg`
    const filePath = `default/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, svgBuffer, {
        contentType: 'image/svg+xml',
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