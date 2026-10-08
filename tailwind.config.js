const BLUE = { 50: '#EEF2F8', 100: '#DCE3EF', 200: '#B9C6E0', 300: '#8CA0C8', 400: '#7F9AD0', 500: '#1E3A6E', 600: '#1A3260', 700: '#152A52', 800: '#102143', 900: '#0B1730', 950: '#070F20' }

// Token semantik dari app/globals.css (HSL triplet) — deviasi resmi redesign 2026-10-08.
const v = (name) => `hsl(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ["var(--font-sans)", "system-ui", "sans-serif"],
  			mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		// Brand ProMaP: navy menggantikan skala blue global + gold sebagai aksen (legacy, dimigrasi per batch).
  		colors: {
  			blue: BLUE,
  			gold: { 50: '#FBF6E9', 100: '#F5EACB', 200: '#EBD597', 300: '#E0C068', 400: '#D4AF37', 500: '#C29B2A', 600: '#9A7514', 700: '#7A5C0F', 800: '#5C450B', 900: '#3D2E07' },
  			background: v('background'),
  			foreground: v('foreground'),
  			card: { DEFAULT: v('card'), foreground: v('card-foreground') },
  			popover: { DEFAULT: v('popover'), foreground: v('popover-foreground') },
  			muted: { DEFAULT: v('muted'), foreground: v('muted-foreground') },
  			accent: { DEFAULT: v('accent'), foreground: v('accent-foreground') },
  			'fg-secondary': v('fg-secondary'),
  			border: v('border'),
  			input: v('input'),
  			primary: { DEFAULT: v('primary'), hover: v('primary-hover'), foreground: v('primary-foreground') },
  			brand: { DEFAULT: v('brand'), text: v('brand-text') },
  			ring: v('ring'),
  			destructive: { DEFAULT: v('destructive'), foreground: v('destructive-foreground'), text: v('destructive-text') },
  			sidebar: { DEFAULT: v('sidebar'), foreground: v('sidebar-foreground'), accent: v('sidebar-accent') },
  			chart: { 1: v('chart-1'), 2: v('chart-2'), 3: v('chart-3'), 4: v('chart-4'), 5: v('chart-5') }
  		},
  		// ring-blue-500 ikut tema via CSS var (navy terang/gelap); shade lain tetap.
  		ringColor: {
  			blue: { ...BLUE, 500: 'rgb(var(--ring-focus) / <alpha-value>)' }
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
