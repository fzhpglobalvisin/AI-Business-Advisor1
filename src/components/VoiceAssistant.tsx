import { motion } from "motion/react";
import { Mic, MicOff, Loader2, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceAssistantProps {
  isListening: boolean;
  isSpeaking: boolean;
  isConnecting: boolean;
  onToggle: () => void;
  captions?: { id: string; role: "user" | "ai"; text: string; isFinished: boolean }[];
}

export function VoiceAssistant({
  isListening,
  isSpeaking,
  isConnecting,
  onToggle,
  captions = [],
}: VoiceAssistantProps) {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative flex items-center justify-center w-64 h-64">
        {/* Outer glow rings */}
        {(isListening || isSpeaking) && (
          <>
            <motion.div
              className={cn(
                "absolute inset-0 rounded-full opacity-20",
                isSpeaking ? "bg-blue-500" : "bg-emerald-500"
              )}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: isSpeaking ? 1.5 : 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className={cn(
                "absolute inset-4 rounded-full opacity-30",
                isSpeaking ? "bg-blue-400" : "bg-emerald-400"
              )}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: isSpeaking ? 1 : 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2,
              }}
            />
          </>
        )}

        {/* Core orb */}
        <motion.button
          onClick={onToggle}
          disabled={isConnecting}
          className={cn(
            "relative z-10 flex items-center justify-center w-32 h-32 rounded-full shadow-2xl transition-colors duration-500",
            isConnecting
              ? "bg-zinc-800 cursor-not-allowed"
              : isSpeaking
              ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/50"
              : isListening
              ? "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-500/50"
              : "bg-zinc-800 hover:bg-zinc-700 shadow-black/50"
          )}
          whileHover={!isConnecting ? { scale: 1.05 } : {}}
          whileTap={!isConnecting ? { scale: 0.95 } : {}}
        >
          {isConnecting ? (
            <Loader2 className="w-12 h-12 text-zinc-400 animate-spin" />
          ) : isListening || isSpeaking ? (
            <Mic className="w-12 h-12 text-white" />
          ) : (
            <MicOff className="w-12 h-12 text-zinc-400" />
          )}
        </motion.button>
      </div>

      {/* Captions display */}
      {captions.length > 0 && (
        <div className="w-full max-w-md mt-6 space-y-3 max-h-48 overflow-y-auto">
          {captions.map((caption) => (
            <div
              key={caption.id}
              className={cn(
                "flex items-start gap-2 p-3 rounded-lg text-sm",
                caption.role === "user"
                  ? "bg-zinc-800 ml-8"
                  : "bg-zinc-800/50 mr-8"
              )}
            >
              {caption.role === "user" ? (
                <User className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Bot className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              )}
              <span className="text-zinc-300">{caption.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
