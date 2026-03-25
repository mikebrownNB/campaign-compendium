/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        deep: '#0a0a12',
        card: '#12121e',
        'card-hover': '#1a1a2e',
        'border-subtle': '#2a2a40',
        'border-glow': '#6b4cff',
        'text-primary': '#e8e4f0',
        'text-secondary': '#9a94a8',
        'text-muted': '#6a6578',
        accent: {
          purple: '#8b5cf6',
          gold: '#f5c542',
          red: '#ef4444',
          green: '#22c55e',
          blue: '#3b82f6',
          teal: '#14b8a6',
          orange: '#f97316',
          pink: '#ec4899',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Atkinson Hyperlegible', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
