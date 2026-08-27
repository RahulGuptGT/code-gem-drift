import { useEffect, useRef, useState, useCallback } from "react";

// Web Speech API wrapper
type SR = any;

export function useVoiceInput(lang: string = "hi-IN") {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    const w = window as any;
    const SRClass = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(!!SRClass);
  }, []);

  const start = useCallback(() => {
    const w = window as any;
    const SRClass = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SRClass) return;
    try {
      const rec = new SRClass();
      rec.lang = lang;
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        let txt = "";
        for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
        setTranscript(txt);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recRef.current = rec;
      setTranscript("");
      setListening(true);
      rec.start();
    } catch (e) {
      console.error("voice start error", e);
      setListening(false);
    }
  }, [lang]);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  return { listening, transcript, supported, start, stop, reset: () => setTranscript("") };
}
