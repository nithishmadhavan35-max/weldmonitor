/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // No dark mode — white theme only
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1d4ed8',
          light:   '#eff6ff',
          border:  '#bfdbfe',
          hover:   '#1e40af',
        },
        surface: {
          bg:      '#f5f6f8',
          card:    '#ffffff',
          hover:   '#f0f2f5',
        },
        neutral: {
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        success: {
          DEFAULT: '#16a34a',
          bg:      '#f0fdf4',
          border:  '#bbf7d0',
          light:   '#dcfce7',
        },
        danger: {
          DEFAULT: '#dc2626',
          bg:      '#fef2f2',
          border:  '#fecaca',
          light:   '#fee2e2',
        },
        warning: {
          DEFAULT: '#d97706',
          bg:      '#fffbeb',
          border:  '#fde68a',
          light:   '#fef3c7',
        },
        info: {
          DEFAULT: '#2563eb',
          bg:      '#eff6ff',
          border:  '#bfdbfe',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono:    ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'card':   '0 1px 4px rgba(0,0,0,0.06)',
        'card-md':'0 2px 12px rgba(0,0,0,0.08)',
        'dropdown': '0 8px 32px rgba(0,0,0,0.10)',
      },
      borderRadius: {
        'xl': '10px',
        '2xl': '14px',
      },
    },
  },
  plugins: [],
}
