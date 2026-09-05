// D:\ai_business_advisor_v1\src\hooks\useGemini.ts
import { useState, useRef, useCallback } from "react";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface Caption {
  id: string;
  role: "user" | "ai";
  text: string;
  isFinished: boolean;
}

// Inline AudioWorklet processor script to run PCM processing off the main UI thread
const pcmWorkletCode = `
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const inputData = input[0];
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
      }
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

export function useGemini() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  const playAudio = async () => {
    if (!audioContextRef.current || playbackQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);

    const audioData = playbackQueueRef.current.shift()!;
    const audioBuffer = audioContextRef.current.createBuffer(
      1,
      audioData.length,
      24000
    );
    audioBuffer.getChannelData(0).set(audioData);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    const currentTime = audioContextRef.current.currentTime;
    const startTime = Math.max(currentTime, nextPlayTimeRef.current);
    source.start(startTime);

    nextPlayTimeRef.current = startTime + audioBuffer.duration;

    source.onended = () => {
      if (playbackQueueRef.current.length === 0) {
        isPlayingRef.current = false;
        setIsSpeaking(false);
      } else {
        playAudio();
      }
    };
  };

  const connect = useCallback(async (systemInstruction: string, language: string) => {
    if (!ai) {
      setError("AI API key not configured. Please set GEMINI_API_KEY.");
      return;
    }
    try {
      setIsConnecting(true);
      setError(null);
      setCaptions([]);

      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: 16000 });

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      // Load AudioWorklet from dynamic blob URL
      const blob = new Blob([pcmWorkletCode], { type: "application/javascript" });
      const workletUrl = URL.createObjectURL(blob);
      await audioContextRef.current.audioWorklet.addModule(workletUrl);

      sourceRef.current = audioContextRef.current.createMediaStreamSource(
        mediaStreamRef.current
      );
      workletNodeRef.current = new AudioWorkletNode(
        audioContextRef.current,
        "pcm-processor"
      );

      sourceRef.current.connect(workletNodeRef.current);

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `${systemInstruction}\n\nPlease speak in ${language}.`,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Zephyr" },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            setIsListening(true);

            // Audio processing runs on separate thread, posted back via message event
            if (workletNodeRef.current) {
              workletNodeRef.current.port.onmessage = (e) => {
                const pcmBuffer = e.data;
                const pcm16 = new Int16Array(pcmBuffer);
                const base64 = btoa(
                  String.fromCharCode(...new Uint8Array(pcm16.buffer))
                );
                sessionPromise.then((session) =>
                  session.sendRealtimeInput({
                    media: { data: base64, mimeType: "audio/pcm;rate=16000" },
                  })
                );
              };
            }
          },
          onmessage: (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const pcm16 = new Int16Array(bytes.buffer);
              const float32 = new Float32Array(pcm16.length);
              for (let i = 0; i < pcm16.length; i++) {
                float32[i] = pcm16[i] / 32768;
              }

              playbackQueueRef.current.push(float32);
              if (!isPlayingRef.current) {
                playAudio();
              }
            }

            if (message.serverContent?.interrupted) {
              playbackQueueRef.current = [];
              nextPlayTimeRef.current = 0;
            }

            // Handle Transcriptions
            if (message.serverContent?.inputTranscription) {
              const { text, finished } = message.serverContent.inputTranscription;
              if (text) {
                setCaptions((prev) => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === "user" && !last.isFinished) {
                    const newCaptions = [...prev];
                    newCaptions[newCaptions.length - 1] = { ...last, text: last.text + text, isFinished: !!finished };
                    return newCaptions;
                  } else {
                    return [...prev, { id: Date.now().toString(), role: "user", text, isFinished: !!finished }];
                  }
                });
              }
            }

            if (message.serverContent?.outputTranscription) {
              const { text, finished } = message.serverContent.outputTranscription;
              if (text) {
                setCaptions((prev) => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === "ai" && !last.isFinished) {
                    const newCaptions = [...prev];
                    newCaptions[newCaptions.length - 1] = { ...last, text: last.text + text, isFinished: !!finished };
                    return newCaptions;
                  } else {
                    return [...prev, { id: Date.now().toString(), role: "ai", text, isFinished: !!finished }];
                  }
                });
              }
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Connection error occurred.");
            disconnect();
          },
          onclose: () => {
            disconnect();
          },
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("Failed to connect:", err);
      setError(err.message || "Failed to connect to microphone or AI service.");
      disconnect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsListening(false);
    setIsSpeaking(false);
    playbackQueueRef.current = [];
    nextPlayTimeRef.current = 0;
    isPlayingRef.current = false;
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    isSpeaking,
    isListening,
    error,
    captions,
  };
}