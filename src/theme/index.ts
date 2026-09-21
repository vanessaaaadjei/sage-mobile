import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  background: '#F5F7F4',
  surface: '#FFFFFF',
  surfaceMuted: '#EDF2EE',
  border: '#E1E7E2',
  text: '#0F1A14',
  textMuted: '#66736C',
  textOnPrimary: '#FFFFFF',
  primary: '#0B6E4F',
  primaryDark: '#075039',
  primarySoft: '#DDF1E8',
  accent: '#F4B942',
  accentSoft: '#FFF4D6',
  success: '#1B8A5A',
  successSoft: '#E1F5EA',
  warning: '#B25E09',
  warningSoft: '#FFF0E0',
  danger: '#C62828',
  dangerSoft: '#FDECEC',
  infoSoft: '#E4EEFF',
  info: '#2450B8',
  ink: '#101B15',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const shadow: Record<'card' | 'floating', ViewStyle> = {
  card: Platform.select<ViewStyle>({
    web: { boxShadow: '0 1px 2px rgba(15, 26, 20, 0.04), 0 6px 18px rgba(15, 26, 20, 0.06)' } as ViewStyle,
    default: {
      shadowColor: colors.ink,
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
  })!,
  floating: Platform.select<ViewStyle>({
    web: { boxShadow: '0 12px 32px rgba(15, 26, 20, 0.22)' } as ViewStyle,
    default: {
      shadowColor: colors.ink,
      shadowOpacity: 0.22,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  })!,
};

export const typography: Record<'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'overline', TextStyle> = {
  display: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  heading: { fontSize: 17, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  caption: { fontSize: 12, color: colors.textMuted },
  overline: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' },
};

const PALETTE = ['#0B6E4F', '#2450B8', '#B25E09', '#7A3E9D', '#C62828', '#0E7C86'];

export function toneFor(seed: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const fg = PALETTE[hash % PALETTE.length];
  return { fg, bg: `${fg}1A` };
}
