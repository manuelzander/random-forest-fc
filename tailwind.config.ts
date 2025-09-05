import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: "2rem",
  		screens: {
  			"2xl": "1400px",
  		},
  	},
  	extend: {
  		fontFamily: {
  			'cyber': ['Orbitron', 'monospace'],
  			'retro': ['Rajdhani', 'sans-serif'],
  			'vice': ['Exo 2', 'sans-serif'],
  			sans: ['Rajdhani', 'system-ui', 'sans-serif'],
  		},
  		colors: {
  			border: "hsl(var(--border))",
  			input: "hsl(var(--input))",
  			ring: "hsl(var(--ring))",
  			background: "hsl(var(--background))",
  			foreground: "hsl(var(--foreground))",
  			primary: {
  				DEFAULT: "hsl(var(--primary))",
  				foreground: "hsl(var(--primary-foreground))",
  			},
  			secondary: {
  				DEFAULT: "hsl(var(--secondary))",
  				foreground: "hsl(var(--secondary-foreground))",
  			},
  			destructive: {
  				DEFAULT: "hsl(var(--destructive))",
  				foreground: "hsl(var(--destructive-foreground))",
  			},
  			muted: {
  				DEFAULT: "hsl(var(--muted))",
  				foreground: "hsl(var(--muted-foreground))",
  			},
  			accent: {
  				DEFAULT: "hsl(var(--accent))",
  				foreground: "hsl(var(--accent-foreground))",
  			},
  			popover: {
  				DEFAULT: "hsl(var(--popover))",
  				foreground: "hsl(var(--popover-foreground))",
  			},
  			card: {
  				DEFAULT: "hsl(var(--card))",
  				foreground: "hsl(var(--card-foreground))",
  			},
  			// Vice City Colors
  			'vice-pink': 'hsl(var(--vice-pink))',
  			'vice-cyan': 'hsl(var(--vice-cyan))',
  			'vice-purple': 'hsl(var(--vice-purple))',
  			'vice-orange': 'hsl(var(--vice-orange))',
  			'vice-blue': 'hsl(var(--vice-blue))',
  			'vice-dark': 'hsl(var(--vice-dark))',
  			'vice-darker': 'hsl(var(--vice-darker))',
  			'vice-light': 'hsl(var(--vice-light))',
  		},
  		borderRadius: {
  			lg: "var(--radius)",
  			md: "calc(var(--radius) - 2px)",
  			sm: "calc(var(--radius) - 4px)",
  		},
  		backgroundImage: {
  			'gradient-primary': 'var(--gradient-primary)',
  			'gradient-secondary': 'var(--gradient-secondary)',
  			'gradient-accent': 'var(--gradient-accent)',
  			'gradient-background': 'var(--gradient-background)',
  		},
  		boxShadow: {
  			'neon': 'var(--shadow-neon)',
  			'cyber': 'var(--shadow-cyber)',
  			'glow-pink': 'var(--glow-pink)',
  			'glow-cyan': 'var(--glow-cyan)',
  			'glow-purple': 'var(--glow-purple)',
  		},
  		keyframes: {
  			"accordion-down": {
  				from: { height: "0" },
  				to: { height: "var(--radix-accordion-content-height)" },
  			},
  			"accordion-up": {
  				from: { height: "var(--radix-accordion-content-height)" },
  				to: { height: "0" },
  			},
  			"neon-pulse": {
  				"0%, 100%": {
  					boxShadow: "0 0 5px hsl(var(--vice-pink)), 0 0 10px hsl(var(--vice-pink)), 0 0 15px hsl(var(--vice-pink))",
  				},
  				"50%": {
  					boxShadow: "0 0 2px hsl(var(--vice-pink)), 0 0 5px hsl(var(--vice-pink)), 0 0 8px hsl(var(--vice-pink))",
  				},
  			},
  			"cyber-glow": {
  				"0%, 100%": {
  					boxShadow: "0 0 5px hsl(var(--vice-cyan)), 0 0 10px hsl(var(--vice-cyan)), 0 0 15px hsl(var(--vice-cyan))",
  				},
  				"50%": {
  					boxShadow: "0 0 2px hsl(var(--vice-cyan)), 0 0 5px hsl(var(--vice-cyan)), 0 0 8px hsl(var(--vice-cyan))",
  				},
  			},
  		},
  		animation: {
  			"accordion-down": "accordion-down 0.2s ease-out",
  			"accordion-up": "accordion-up 0.2s ease-out",
  			"neon-pulse": "neon-pulse 2s ease-in-out infinite",
  			"cyber-glow": "cyber-glow 2s ease-in-out infinite",
  		},
  	},
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;