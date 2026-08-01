/**
 * Mirrors frontend/base/src/theme/colors.ts + palette.ts so the mobile app reads as the
 * same product as the web dashboard (DashdarkX dark theme).
 */
export const colors = {
  background: '#081028', // info.darker
  surface: '#0B1739', // info.main
  surfaceAlt: '#0A1330', // info.dark
  primary: '#CB3CFF', // purple[500]
  primaryDark: '#7D1A99', // purple[700]
  textPrimary: '#FFFFFF',
  textSecondary: '#AEB9E1', // grey[300]
  textDisabled: '#4A5568', // grey[500]
  border: '#2D3748', // grey[700]
  error: '#FF5A65', // red[500]
  success: '#14CA74', // green[500]
} as const;
