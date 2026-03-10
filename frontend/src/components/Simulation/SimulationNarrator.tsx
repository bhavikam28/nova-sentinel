/**
 * Simulation Narrator — TTS for Live Attack Simulation
 * Uses Web Speech API with female voice (Aria-style)
 */
import { useCallback, useEffect } from 'react';

function getFemaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred = [
    'Microsoft Aria',
    'Microsoft Jenny',
    'Google UK English Female',
    'Google US English',
    'Samantha',
    'Karen',
    'Moira',
    'Tessa',
    'Victoria',
    'Microsoft Zira',
  ];
  for (const name of preferred) {
    const v = voices.find((x) => x.name.includes(name));
    if (v) return v;
  }
  const female = voices.find(
    (v) =>
      v.name.toLowerCase().includes('female') ||
      v.name.includes('Zira') ||
      v.name.includes('Aria')
  );
  if (female) return female;
  return voices.length > 1 ? voices[1] : voices[0] || null;
}

export function useSimulationNarrator(volume: number = 1) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getFemaleVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.volume = Math.max(0, Math.min(1, volume));
    utterance.onend = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
  }, [volume]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, stop };
}
