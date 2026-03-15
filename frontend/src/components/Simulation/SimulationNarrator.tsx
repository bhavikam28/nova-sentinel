/**
 * Simulation Narrator — TTS for Live Attack Simulation
 * Uses Web Speech API with female voice (Lyra)
 * Supports: intro narration, queued sentences (no abrupt cuts), smooth continuous feel
 */
import { useCallback, useEffect, useRef } from 'react';

function getFemaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  // Priority order: most natural-sounding neural/professional voices first
  const preferred = [
    'Microsoft Aria Online (Natural)',
    'Microsoft Aria',
    'Microsoft Jenny Online (Natural)',
    'Microsoft Jenny',
    'Google UK English Female',
    'Samantha',            // macOS high-quality voice
    'Karen',               // macOS Australian
    'Moira',               // macOS Irish — natural cadence
    'Tessa',               // macOS South African
    'Victoria',
    'Google US English',
    'Microsoft Zira',
  ];
  for (const name of preferred) {
    const v = voices.find((x) => x.name === name || x.name.startsWith(name));
    if (v) return v;
  }
  // Fallback: any English female voice
  const enFemale = voices.find(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.toLowerCase().includes('female') ||
       v.name.includes('Zira') ||
       v.name.includes('Aria') ||
       v.name.includes('Jenny'))
  );
  if (enFemale) return enFemale;
  return voices.length > 1 ? voices[1] : voices[0] || null;
}

/** Split text into natural sentence-sized chunks for smoother TTS delivery */
function splitIntoChunks(text: string): string[] {
  // Split on ". " or "! " or "? " — but keep the punctuation
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function useSimulationNarrator(volume: number = 1) {
  const volumeRef = useRef(volume);
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Pre-load voices on mount
    const load = () => window.speechSynthesis.getVoices();
    load();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }, []);

  const speakNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      speakingRef.current = false;
      return;
    }
    const chunk = queueRef.current.shift()!;
    if (!chunk || typeof window === 'undefined' || !window.speechSynthesis) return;
    speakingRef.current = true;
    const utterance = new SpeechSynthesisUtterance(chunk);
    const voice = getFemaleVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.87;   // measured, deliberate — professional broadcast cadence
    utterance.pitch = 1.0;   // neutral pitch — avoids the classic TTS "robot" effect
    utterance.volume = Math.max(0, Math.min(1, volumeRef.current));
    utterance.onend = () => {
      // tiny gap between sentences for natural breathing
      setTimeout(speakNext, 80);
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      setTimeout(speakNext, 200);
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  /**
   * speak() — enqueue a full narration block.
   * Splits into sentence chunks so speech flows naturally without
   * the browser cutting off mid-sentence when the next event fires.
   * Set interrupt=true to cancel current speech and start immediately.
   */
  const speak = useCallback((text: string, interrupt = true) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const chunks = splitIntoChunks(text);
    if (interrupt) {
      window.speechSynthesis.cancel();
      queueRef.current = chunks;
      speakingRef.current = false;
      // Small delay so cancel() clears cleanly before new utterance
      setTimeout(speakNext, 120);
    } else {
      // Append to queue — speech continues naturally after current sentence
      queueRef.current.push(...chunks);
      if (!speakingRef.current) speakNext();
    }
  }, [speakNext]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      queueRef.current = [];
      speakingRef.current = false;
    }
  }, []);

  return { speak, stop };
}
