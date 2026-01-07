import { FontStyle, AnimationStyle, TextPosition, StyleConfig } from './types';

export const DEFAULT_STYLE: StyleConfig = {
  fontFamily: FontStyle.BOLD,
  fontSize: 48,
  color: '#FFFFFF',
  strokeColor: '#000000',
  strokeWidth: 4,
  yOffset: 80, // Default to bottom area
  animation: AnimationStyle.POP,
  shadow: true,
  uppercase: true,
};

export const FONTS = [
  { label: 'Clean', value: FontStyle.CLASSIC },
  { label: 'Bold Impact', value: FontStyle.BOLD },
  { label: 'Comic', value: FontStyle.COMIC },
  { label: 'Marker', value: FontStyle.MARKER },
];

export const ANIMATIONS = [
  { label: 'None', value: AnimationStyle.NONE },
  { label: 'Pop In', value: AnimationStyle.POP },
  { label: 'Slide Up', value: AnimationStyle.SLIDE_UP },
];
