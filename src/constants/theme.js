/**
 * ZRP SafeTap Mobile Application Design System Tokens
 * Strictly following styles.md and layout.md specification
 */

export const colors = {
  // Primary Branding (Deep Navy Blue)
  primary: "#1E3A8A",
  primaryHover: "#172554",
  primaryPressed: "#1E1B4B",

  // Semantics
  success: "#0E9F6E",
  warning: "#F59E0B",
  danger: "#DC2626",
  info: "#2563EB",

  // Neutral Palette
  neutral: {
    950: "#0B1220", // Text Primary / Dark Mode BG
    900: "#111827",
    800: "#1F2937",
    700: "#374151",
    600: "#4B5563", // Text Secondary
    500: "#6B7280", // Muted / Icons
    400: "#9CA3AF", // Disabled
    300: "#D1D5DB",
    200: "#E5E7EB", // Borders
    100: "#F3F4F6", // Section BG
    50: "#F9FAFB",  // Page BG
    white: "#FFFFFF",
  },

  // Contextual Semantic Names
  pageBg: "#F9FAFB",
  cardBg: "#FFFFFF",
  sectionBg: "#F3F4F6",
  textPrimary: "#0B1220",
  textSecondary: "#4B5563",
  textMuted: "#6B7280",
  textDisabled: "#9CA3AF",
  textInverse: "#FFFFFF",
  border: "#E5E7EB",
};

export const radius = {
  sm: 12,
  md: 12,
  lg: 12,
  xl: 12,
  xxl: 12,

  // Component Specific
  button: 12,
  card: 12,
  sheet: 12,
  modal: 12,
  input: 12,
  chip: 12,
  image: 12,
};

export const spacing = {
  tiny: 4,
  micro: 8,
  component: 12,
  card: 16,
  cardSpacing: 16, // alias — matches StyleSheet usage across screens
  screenPadding: 20,
  section: 32,
  large: 40,
  xlarge: 48,
  xxlarge: 64,

  // Numbers for direct style reference
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  64: 64,
};

export const componentHeights = {
  smallButton: 40,
  defaultButton: 48,
  largeButton: 56,
  input: 56,
  search: 56,
  bottomNav: 72,
  appBar: 64,
  listTile: 72,
};

export const typography = {
  display: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "700",
  },
  heading1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700",
  },
  heading2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700",
  },
  heading3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
};

export const elevation = {
  level0: {
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  level1: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 0,
    shadowOpacity: 0,
  },
  level2: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    elevation: 0,
    shadowOpacity: 0,
  },
};

export const borders = {
  default: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  faint: {
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  focused: {
    borderWidth: 1.5,
    borderColor: "#0F4C81",
  },
};

export default {
  colors,
  radius,
  spacing,
  componentHeights,
  typography,
  elevation,
  borders,
};
