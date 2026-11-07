/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        finhub: {
          primary: '#1B5E20',
          hover: '#144918',
          light: '#E8F5E9',
          surface: '#F8F9FA',
          income: '#2E7D32',
          incomeContainer: '#E8F5E9',
          expense: '#D32F2F',
          expenseContainer: '#FFEBEE',
          border: '#E0E0E0',
          textDark: '#212121',
          textMuted: '#757575',
        }
      }
    },
  },
  plugins: [],
}
