import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        lprc: {
          azul:       '#0A1F44',
          'azul-mid': '#122456',
          'azul-light':'#1A3A7A',
          dorado:     '#F5C400',
          'dorado-dark':'#C49B00',
        },
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        body:    ['var(--font-barlow)', 'sans-serif'],
        mono:    ['var(--font-barlow-condensed)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
