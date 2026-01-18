/**
 * OpenAEC Huisstijl Kleuren
 * Gebruik deze constanten voor consistente kleuren door de hele applicatie
 */

export const colors = {
  // Primaire kleuren
  violet: '#350E35',
  violetLight: '#4a1f4a',
  verdigris: '#44B6A8',
  verdigrisLight: '#5cc4b7',
  
  // Accent kleuren
  yellow: '#EFBD75',
  magenta: '#A01C48',
  peach: '#DB4C40',
  
  // Neutrals
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
}

// Tailwind class mappings voor veelgebruikte combinaties
export const colorClasses = {
  primary: 'bg-violet text-white',
  secondary: 'bg-verdigris text-white',
  accent: 'bg-friendly-yellow text-violet',
  error: 'bg-flaming-peach text-white',
  neutral: 'bg-gray-200 text-gray-700',
}
