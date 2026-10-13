export function useAudioInstructions() {
  const LANG_CODES = {
    en: "en-IN",
    kn: "kn-IN",
    ta: "ta-IN",
    te: "te-IN",
    hi: "hi-IN"
  };

  const speakText = (text, language = "kn") => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANG_CODES[language] || "kn-IN";
      utterance.rate = 0.85;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch {
      // silence — speech is a bonus, never a blocker
    }
  };

  const stopSpeaking = () => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // silence
    }
  };

  return { speakText, stopSpeaking };
}