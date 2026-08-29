import { Instrument_Serif, DM_Mono, Geist } from 'next/font/google';
import localFont from 'next/font/local';

// === Design system fonts ===

export const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-instrument-serif',
});

export const dmMono = DM_Mono({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-mono',
});

export const geist = Geist({
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

export const satoshi = localFont({
  src: '../public/fonts/Satoshi-Variable.woff2',
  display: 'swap',
  variable: '--font-satoshi',
  weight: '400 700',
});
