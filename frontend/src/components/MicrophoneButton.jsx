import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

export default function MicrophoneButton({ onTranscriptReady, onListeningChange }) {
  const { 
    transcript, 
    isListening, 
    error, 
    startListening, 
    stopListening,
    clearTranscript 
  } = useSpeechRecognition();

  // Send transcript when stop listening
  const handleStopListening = () => {
    stopListening();
    if (transcript && transcript.trim() && onTranscriptReady) {
      onTranscriptReady(transcript);
    }
    if (onListeningChange) onListeningChange(false);
  };

  const handleStartListening = () => {
    clearTranscript();
    startListening();
    if (onListeningChange) onListeningChange(true);
  };

  return (
    <div className="relative">
      <button
        onClick={isListening ? handleStopListening : handleStartListening}
        className={`px-4 py-3 rounded-2xl font-semibold transition-all duration-200 flex items-center gap-2 ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
        }`}
        title={isListening ? "Stop recording" : "Start voice input"}
      >
        <span className="text-xl">
          {isListening ? '🔴' : '🎤'}
        </span>
        <span className="hidden sm:inline">
          {isListening ? 'Recording...' : 'Voice'}
        </span>
      </button>
      
      {error && (
        <div className="absolute top-full mt-2 bg-red-500/20 text-red-400 text-xs p-2 rounded-lg whitespace-nowrap">
          Error: {error}
        </div>
      )}
      
      {isListening && transcript && (
        <div className="absolute bottom-full mb-2 right-0 bg-[#0b1220] border border-blue-500 p-3 rounded-xl min-w-[200px] shadow-xl">
          <p className="text-xs text-gray-400 mb-1">🎙️ Speaking:</p>
          <p className="text-sm text-white">{transcript.slice(-100)}</p>
          <p className="text-xs text-green-400 mt-1 animate-pulse">Listening...</p>
        </div>
      )}
    </div>
  );
}