/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // OpenAEC Huisstijl
        'violet': '#350E35',
        'violet-light': '#4a1f4a',
        'verdigris': '#44B6A8',
        'verdigris-light': '#5cc4b7',
        'friendly-yellow': '#EFBD75',
        'warm-magenta': '#A01C48',
        'flaming-peach': '#DB4C40',
      },
      fontFamily: {
        'sans': ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
