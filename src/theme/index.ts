import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F3',
  border: '#D5DAE3',
  text: '#111827',
  textMuted: '#6B7280',
  textOnPrimary: '#FFFFFF',
  primary: '#163A7A',
  primaryDark: '#0F2A5C',
  primarySoft: '#E7EDF5',
  accent: '#163A7A',
  accentSoft: '#E7EDF5',
  success: '#0F7A4F',
  successSoft: '#E6F4EE',
  warning: '#9A5B00',
  warningSoft: '#F7EFE3',
  danger: '#B42318',
  dangerSoft: '#F8E8E6',
  infoSoft: '#E7EDF5',
  info: '#163A7A',
  ink: '#111827',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 4, md: 6, lg: 8, xl: 10, pill: 999 };

export const shadow: Record<'card' | 'floating', ViewStyle> = {
  card: Platform.select<ViewStyle>({
    web: { boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)' } as ViewStyle,
    default: {
      shadowColor: colors.ink,
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
  })!,
  floating: Platform.select<ViewStyle>({
    web: { boxShadow: '0 8px 24px rgba(17, 24, 39, 0.16)' } as ViewStyle,
    default: {
      shadowColor: colors.ink,
      shadowOpacity: 0.16,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
  })!,
};

export const typography: Record<'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'overline', TextStyle> = {
  display: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  heading: { fontSize: 15, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  caption: { fontSize: 12, color: colors.textMuted },
  overline: { fontSize: 10, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
};

const PALETTE = ['#163A7A', '#0E7C86', '#9A5B00', '#5B4B8A', '#B42318', '#0F7A4F'];

export function toneFor(seed: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const fg = PALETTE[hash % PALETTE.length];
  return { fg, bg: `${fg}14` };
}
