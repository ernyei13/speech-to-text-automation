export interface SubtitleChunk {
  id: string;
  text: string;
  start: number; // seconds
  end: number; // seconds
}

export enum FontStyle {
  CLASSIC = 'Inter',
  BOLD = 'Montserrat',
  COMIC = 'Bangers',
  MARKER = 'Permanent Marker'
}

export enum AnimationStyle {
  NONE = 'none',
  POP = 'pop',
  SLIDE_UP = 'slide_up',
  FADE = 'fade',
  BOUNCE = 'bounce',
  WORD_PRINT = 'word_print'
}

export enum TextPosition {
  TOP = 'top',
  CENTER = 'center',
  BOTTOM = 'bottom',
  CUSTOM = 'custom'
}

export interface StyleConfig {
  fontFamily: FontStyle;
  fontSize: number;
  color: string;
  highlightColor: string; // New field for active word
  strokeColor: string;
  strokeWidth: number;
  yOffset: number; // Percentage from top (0-100)
  animation: AnimationStyle;
  shadow: boolean;
  uppercase: boolean;
  timingOffset: number; // Seconds to shift subtitle start/end
  animationSpeed: number; // Multiplier for animation duration
}

export type ProcessingStatus = 'idle' | 'extracting_audio' | 'transcribing' | 'ready' | 'exporting';