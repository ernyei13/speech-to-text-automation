import { FontStyle, AnimationStyle, TextPosition, StyleConfig } from './types';

export const DEFAULT_STYLE: StyleConfig = {
  fontFamily: FontStyle.BOLD,
  fontSize: 48,
  color: '#FFFFFF',
  highlightColor: '#FACC15', // Default Yellow-400
  strokeColor: '#000000',
  strokeWidth: 4,
  yOffset: 80, // Default to bottom area
  animation: AnimationStyle.POP,
  shadow: true,
  uppercase: true,
  timingOffset: 0,
  animationSpeed: 1.0,
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
  { label: 'Bounce', value: AnimationStyle.BOUNCE },
  { label: 'Fade In', value: AnimationStyle.FADE },
  { label: 'Word by Word', value: AnimationStyle.WORD_PRINT },
];