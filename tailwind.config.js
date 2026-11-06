/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./config/**/*.{js,ts}",
    "./lib/**/*.{js,ts}"
  ],
  theme: {
    extend: {
      // Space adventure palette. Neon colors are bright, so text ON them uses `space-950`.
      colors: {
        space: {
          950: '#050816',
          900: '#0a1030',
          800: '#121a4a',
          700: '#1b2670',
          600: '#2a3a9a',
        },
        neon: {
          cyan: '#38f0ff',
          pink: '#ff5fd7',
          lime: '#b6ff3b',
          amber: '#ffc531',
          violet: '#a98bff',
          coral: '#ff7a8a',
        },
        ink: {
          DEFAULT: '#f2f6ff',
          dim: '#b9c4f2',
        },
      },
      fontFamily: {
        // Chunky rounded kid-friendly face, loaded with next/font in app/layout.jsx
        display: ['"Fredoka Variable"', 'ui-rounded', '"Arial Rounded MT Bold"', 'system-ui', 'sans-serif'],
        sans: ['"Fredoka Variable"', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      // Type scale (mobile-first; every size is >= 16px for inputs/body)
      fontSize: {
        body: ['1.0625rem', { lineHeight: '1.5' }],
        lead: ['1.25rem', { lineHeight: '1.4' }],
        title: ['1.875rem', { lineHeight: '1.1', fontWeight: '700' }],
        hero: ['2.5rem', { lineHeight: '1.05', fontWeight: '700' }],
        number: ['3.5rem', { lineHeight: '1', fontWeight: '700' }],
        jumbo: ['4.5rem', { lineHeight: '1', fontWeight: '700' }],
      },
      borderRadius: {
        chunk: '1.25rem',
        bubble: '2rem',
      },
      boxShadow: {
        'glow-cyan': '0 0 22px rgba(56,240,255,0.55)',
        'glow-pink': '0 0 22px rgba(255,95,215,0.55)',
        'glow-lime': '0 0 22px rgba(182,255,59,0.55)',
        'glow-amber': '0 0 22px rgba(255,197,49,0.55)',
        'glow-violet': '0 0 22px rgba(169,139,255,0.55)',
        'glow-coral': '0 0 22px rgba(255,122,138,0.5)',
        'btn-cyan': '0 5px 0 rgba(0,0,0,0.35), 0 0 22px rgba(56,240,255,0.5)',
        'btn-pink': '0 5px 0 rgba(0,0,0,0.35), 0 0 22px rgba(255,95,215,0.5)',
        'btn-lime': '0 5px 0 rgba(0,0,0,0.35), 0 0 22px rgba(182,255,59,0.5)',
        'btn-amber': '0 5px 0 rgba(0,0,0,0.35), 0 0 22px rgba(255,197,49,0.5)',
        'btn-violet': '0 5px 0 rgba(0,0,0,0.35), 0 0 22px rgba(169,139,255,0.5)',
        'btn-coral': '0 5px 0 rgba(0,0,0,0.35), 0 0 22px rgba(255,122,138,0.45)',
        chunk: '0 5px 0 rgba(0,0,0,0.35)',
        'chunk-sm': '0 3px 0 rgba(0,0,0,0.35)',
      },
      backgroundImage: {
        'space-gradient': 'radial-gradient(120% 80% at 50% 0%, #2a1a6e 0%, #121a4a 38%, #050816 100%)',
        'glass': 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
      },
      // keyframes (twinkle, star-drift) live in app/globals.css: Tailwind only emits
      // config keyframes when an animate-* utility is used, and the star layers use plain CSS.
      animation: {
        twinkle: 'twinkle 3.2s ease-in-out infinite',
      },
    },
  },
  plugins: []
};
