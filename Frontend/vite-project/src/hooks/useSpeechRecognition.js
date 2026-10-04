import { useRef, useState } from "react";

export function useSpeechRecognition(language = "kn") {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const LANG_CODES = {
    en: "en-IN",
    kn: "kn-IN",
    ta: "ta-IN",
    te: "te-IN",
    hi: "hi-IN"
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice not supported in this browser");
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = LANG_CODES[language] || "kn-IN";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => setTranscript(e.results[0][0].transcript);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e) => {
        setError(e.error);
        setIsListening(false);
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setError(err.message || "Voice not supported in this browser");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch (err) {
      // ignore
    }
    setIsListening(false);
  };

  const resetTranscript = () => setTranscript("");

  return { transcript, isListening, error, startListening, stopListening, resetTranscript };
}