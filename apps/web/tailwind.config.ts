import type { Config } from 'tailwindcss';

// Placeholder brand system — swap these values once a real logo/identity
// exists. Kept deliberately small: 2 primary + 1 accent + neutrals, per the
// brand direction in the master prompt (Section 1 / 7).
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0B0D10',
          900: '#12151A',
          800: '#1B1F26',
          700: '#262B33',
          500: '#4A505A',
          300: '#9AA1AC',
          100: '#E7E9EC'
        },
        brand: {
          DEFAULT: '#5B5BF0', // primary — student/news
          dark: '#4341C9',
          light: '#8B8BF7'
        },
        accent: {
          DEFAULT: '#F0B429' // accent — recognition / highlight moments
        },
        teacher: {
          DEFAULT: '#2FBF9F' // secondary — used only for teacher badges/tags
        },
        safe: {
          DEFAULT: '#2B7A78' // calm tone reserved for whistleblower flow
        },
        danger: {
          DEFAULT: '#E5484D'
        }
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        xl2: '1.25rem'
      }
    }
  },
  plugins: []
};

export default config;
