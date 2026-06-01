// client/src/components/RecordingRecorder.jsx
import { useState, useRef } from 'react';
import axios from 'axios';

export default function RecordingRecorder({ meetingId, onRecordingComplete, socket }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [showRecordings, setShowRecordings] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Real-time speech recognition during recording
  const startRealTimeTranscription = () => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setLiveTranscript(transcript);
        
        // Send to AI for task extraction in real-time
        if (transcript && transcript.trim() && socket) {
          console.log("Real-time transcription:", transcript);
          socket.emit("send-transcript", {
            meetingId: meetingId,
            text: transcript,
            sender: "🎙️ Recording",
          });
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };
      
      recognitionRef.current.start();
    } else {
      console.warn("Speech recognition not supported in this browser");
    }
  };

  const stopRealTimeTranscription = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        await uploadRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        stopRealTimeTranscription();
      };
      
      mediaRecorder.current.start(1000); // Collect data every second
      setIsRecording(true);
      startRealTimeTranscription(); // Start real-time task extraction
      
      let time = 0;
      timerRef.current = setInterval(() => {
        time++;
        setRecordingTime(time);
      }, 1000);
      
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Microphone access denied. Please allow microphone access to record.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
  };

  const uploadRecording = async (audioBlob) => {
    setUploading(true);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', audioBlob, `recording-${Date.now()}.webm`);
      formData.append('type', 'audio');
      formData.append('duration', recordingTime.toString());
      
      const res = await axios.post(
        `http://localhost:5001/api/recordings/upload/${meetingId}`,
        formData,
        { headers: { 'Authorization': token, 'Content-Type': 'multipart/form-data' } }
      );
      
      if (res.data.success) {
        alert('Recording saved! Tasks were extracted in real-time during the recording.');
        if (onRecordingComplete) onRecordingComplete();
        fetchRecordings();
      }
      
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload recording");
    } finally {
      setUploading(false);
    }
  };

  const fetchRecordings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5001/api/recordings/meeting/${meetingId}`, {
        headers: { Authorization: token }
      });
      setRecordings(res.data.recordings);
    } catch (err) {
      console.error("Error fetching recordings:", err);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="relative">
      {/* Recording Button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={uploading}
        className={`px-4 py-3 rounded-2xl text-sm font-semibold transition flex items-center gap-2 ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
        }`}
      >
        {isRecording ? (
          <>
            <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
            🎙️ Recording {formatTime(recordingTime)}
          </>
        ) : (
          <>
            <span>🎙️</span>
            {uploading ? 'Uploading...' : 'Record Meeting'}
          </>
        )}
      </button>

      {/* Live Transcript Display (during recording) */}
      {isRecording && liveTranscript && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-blue-500/20 border border-blue-500/30 rounded-xl p-3 z-50 backdrop-blur-sm">
          <p className="text-xs text-blue-400 mb-1">🎤 Live Transcription (AI is extracting tasks...)</p>
          <p className="text-sm text-white">{liveTranscript}</p>
          <p className="text-xs text-green-400 mt-1 animate-pulse">✨ Tasks will appear in real-time →</p>
        </div>
      )}

      {/* View Recordings Button */}
      <button
        onClick={() => {
          setShowRecordings(!showRecordings);
          if (!showRecordings) fetchRecordings();
        }}
        className="ml-2 px-4 py-3 rounded-2xl text-sm bg-blue-500/20 hover:bg-blue-500/30 transition"
      >
        📁 {showRecordings ? 'Hide' : 'View'} Recordings ({recordings.length})
      </button>

      {/* Recordings List */}
      {showRecordings && (
        <div className="absolute top-full mt-2 right-0 w-96 bg-[#111827] border border-[#1f2937] rounded-2xl shadow-2xl z-50">
          <div className="p-4 border-b border-[#1f2937]">
            <h3 className="font-bold">🎧 Meeting Recordings</h3>
            <p className="text-xs text-gray-400">Tasks were extracted automatically from speech</p>
          </div>
          
          <div className="max-h-64 overflow-y-auto p-2">
            {recordings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No recordings yet</p>
                <p className="text-xs mt-1">Click "Record Meeting" to start</p>
              </div>
            ) : (
              recordings.map(rec => (
                <div key={rec._id} className="p-3 border-b border-[#1d2942] hover:bg-[#0b1220] transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{rec.originalName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(rec.createdAt).toLocaleString()} • {formatSize(rec.size)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`http://localhost:5001/api/recordings/download/${rec._id}`}
                        download
                        className="text-blue-400 hover:text-blue-300 text-sm"
                        title="Download"
                      >
                        ⬇️
                      </a>
                      <button
                        onClick={async () => {
                          const token = localStorage.getItem('token');
                          await axios.delete(`http://localhost:5001/api/recordings/${rec._id}`, {
                            headers: { Authorization: token }
                          });
                          fetchRecordings();
                        }}
                        className="text-red-400 hover:text-red-300 text-sm"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <audio controls className="w-full mt-2 h-8">
                    <source src={`http://localhost:5001/api/recordings/stream/${rec._id}`} />
                  </audio>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}