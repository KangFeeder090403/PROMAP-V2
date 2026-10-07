const BLUE = { 50: '#EEF2F8', 100: '#DCE3EF', 200: '#B9C6E0', 300: '#8CA0C8', 400: '#7F9AD0', 500: '#1E3A6E', 600: '#1A3260', 700: '#152A52', 800: '#102143', 900: '#0B1730', 950: '#070F20' }

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ["var(--font-inter)", "system-ui", "sans-serif"]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		// Brand ProMaP: navy menggantikan skala blue global + gold sebagai aksen.
  		colors: {
  			blue: BLUE,
  			gold: { 50: '#FBF6E9', 100: '#F5EACB', 200: '#EBD597', 300: '#E0C068', 400: '#D4AF37', 500: '#C29B2A', 600: '#9A7514', 700: '#7A5C0F', 800: '#5C450B', 900: '#3D2E07' }
  		},
  		// ring-blue-500 ikut tema via CSS var (navy terang/gelap); shade lain tetap.
  		ringColor: {
  			blue: { ...BLUE, 500: 'rgb(var(--ring-focus) / <alpha-value>)' }
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

