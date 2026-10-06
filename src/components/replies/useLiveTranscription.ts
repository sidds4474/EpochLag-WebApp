'use client';

import { useEffect, useRef, useState } from 'react';

type Options = {
  active: boolean;
  lang?: string;
};

type Return = {
  supported: boolean;
  /** Everything the recognizer has finalized so far — stable text. */
  finalText: string;
  /** The current in-flight partial result — may change rapidly, don't persist. */
  interimText: string;
  /** Imperatively wipe the transcript (e.g. when user re-records). */
  reset: () => void;
};

type MinimalRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
};
type SpeechRecognitionResultList = {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
};
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

/**
 * Thin wrapper around the Web Speech API. Browser does on-device STT while
 * `active` is true. Zero cost, zero network. Chrome / Safari (desktop + iOS)
 * supported; Firefox returns `supported: false` and does nothing (caller
 * should hide the transcript UI).
 *
 * Note: SpeechRecognition opens its own mic stream internally — it coexists
 * with the MediaRecorder blob capture happening in parallel.
 */
export function useLiveTranscription({ active, lang = 'en-US' }: Options): Return {
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<MinimalRecognition | null>(null);
  const shouldKeepAliveRef = useRef(false);

  // Detect support on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as {
      SpeechRecognition?: new () => MinimalRecognition;
      webkitSpeechRecognition?: new () => MinimalRecognition;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  useEffect(() => {
    if (!supported) return;
    if (typeof window === 'undefined') return;

    const w = window as unknown as {
      SpeechRecognition?: new () => MinimalRecognition;
      webkitSpeechRecognition?: new () => MinimalRecognition;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;

    if (!active) {
      shouldKeepAliveRef.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setInterimText('');
      return;
    }

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    recognitionRef.current = rec;
    shouldKeepAliveRef.current = true;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let newFinal = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alt = result[0];
        if (result.isFinal) {
          newFinal += alt.transcript;
        } else {
          currentInterim += alt.transcript;
        }
      }
      if (newFinal) {
        setFinalText((prev) =>
          prev ? `${prev.trim()} ${newFinal.trim()}` : newFinal.trim()
        );
      }
      setInterimText(currentInterim);
    };

    rec.onerror = () => {
      // Common error: 'no-speech' — recognizer gave up on silence. The onend
      // handler will restart it if we're still active.
    };

    rec.onend = () => {
      // Chrome's recognizer auto-stops after ~1min or silence. Restart while
      // the caller still wants us active.
      if (shouldKeepAliveRef.current) {
        try {
          rec.start();
        } catch {
          // "already started" or similar transient — safe to ignore.
        }
      }
    };

    try {
      rec.start();
    } catch {
      // Already running — ignore.
    }

    return () => {
      shouldKeepAliveRef.current = false;
      try {
        rec.stop();
      } catch {}
      recognitionRef.current = null;
      setInterimText('');
    };
  }, [active, lang, supported]);

  const reset = () => {
    setFinalText('');
    setInterimText('');
  };

  return { supported, finalText, interimText, reset };
}
