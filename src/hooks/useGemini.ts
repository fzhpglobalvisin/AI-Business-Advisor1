import { useState, useRef, useCallback } from "react";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Caption {
  id: string;
  role: "user" | "ai";
  text: string;
  isFinished: boolean;
}

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
  const processorRef = useRef<ScriptProcessorNode | null>(null);
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

      sourceRef.current = audioContextRef.current.createMediaStreamSource(
        mediaStreamRef.current
      );
      processorRef.current = audioContextRef.current.createScriptProcessor(
        4096,
        1,
        1
      );

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

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
            
            processorRef.current!.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
              }
              const base64 = btoa(
                String.fromCharCode(...new Uint8Array(pcm16.buffer))
              );
              sessionPromise.then((session) =>
                session.sendRealtimeInput({
                  media: { data: base64, mimeType: "audio/pcm;rate=16000" },
                })
              );
            };
          },
          onmessage: (message: LiveServerMessage) => {
            const base64Audio =
              message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
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
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
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
