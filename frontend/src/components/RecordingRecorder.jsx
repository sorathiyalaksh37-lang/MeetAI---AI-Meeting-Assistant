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
  const [error, setError] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);

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
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        
        if (transcript && transcript.trim()) {
          setLiveTranscript(transcript);
          
          // Only send if significant change
          if (transcript.length > 3 && socket) {
            console.log("Real-time transcription:", transcript);
            socket.emit("send-transcript", {
              meetingId: meetingId,
              text: transcript,
              sender: "🎙️ Recording",
            });
          }
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
      setError(null);
      setLiveTranscript("");
      audioChunks.current = [];
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      
      // Create MediaRecorder with proper MIME type
      const options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/mp4';
      }
      
      mediaRecorder.current = new MediaRecorder(stream, options);
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunks.current.push(event.data);
          console.log("Audio chunk received:", event.data.size, "bytes");
        }
      };
      
      mediaRecorder.current.onstop = async () => {
        console.log("Recording stopped, chunks:", audioChunks.current.length);
        
        if (audioChunks.current.length === 0) {
          console.error("No audio data captured");
          setError("No audio captured. Please try again.");
          return;
        }
        
        // Create audio blob
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        console.log("Audio blob created, size:", audioBlob.size);
        
        if (audioBlob.size < 100) {
          setError("Audio recording too small. Please speak louder.");
          return;
        }
        
        // Create local URL for preview
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        
        await uploadRecording(audioBlob);
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        stopRealTimeTranscription();
      };
      
      // Start recording
      mediaRecorder.current.start(1000);
      setIsRecording(true);
      startRealTimeTranscription();
      
      let time = 0;
      timerRef.current = setInterval(() => {
        time++;
        setRecordingTime(time);
      }, 1000);
      
      console.log("Recording started successfully");
      
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Microphone access denied. Please allow microphone access.");
      alert("Microphone access denied. Please allow microphone access to record.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      console.log("Stopping recording...");
      mediaRecorder.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
  };

  const uploadRecording = async (audioBlob) => {
    setUploading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError("Please login to upload recordings");
        alert("Please login to upload recordings");
        return;
      }
      
      const formData = new FormData();
      const filename = `recording-${Date.now()}.webm`;
      formData.append('file', audioBlob, filename);
      formData.append('type', 'audio');
      formData.append('duration', recordingTime.toString());
      
      console.log("Uploading recording...", {
        meetingId,
        fileSize: audioBlob.size,
        duration: recordingTime
      });
      
      const res = await axios.post(
        `http://localhost:5001/api/recordings/upload/${meetingId}`,
        formData,
        { 
          headers: { 
            'Authorization': token,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      console.log("Upload response:", res.data);
      
      if (res.data.success) {
        alert('✅ Recording saved successfully!');
        if (onRecordingComplete) onRecordingComplete();
        await fetchRecordings();
        setAudioURL(null);
      } else {
        setError(res.data.error || "Failed to upload recording");
        alert("Failed to upload recording: " + (res.data.error || "Unknown error"));
      }
      
    } catch (err) {
      console.error("Upload error:", err);
      console.error("Error response:", err.response?.data);
      
      let errorMsg = "Failed to upload recording. ";
      if (err.response?.status === 401) {
        errorMsg += "Please login again.";
      } else if (err.response?.status === 404) {
        errorMsg += "Meeting not found.";
      } else if (err.response?.data?.error) {
        errorMsg += err.response.data.error;
      } else if (err.code === 'ECONNABORTED') {
        errorMsg += "Upload timed out. Please try again.";
      } else {
        errorMsg += err.message;
      }
      
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const fetchRecordings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await axios.get(`http://localhost:5001/api/recordings/meeting/${meetingId}`, {
        headers: { Authorization: token }
      });
      setRecordings(res.data.recordings || []);
    } catch (err) {
      console.error("Error fetching recordings:", err);
    }
  };

  const deleteRecording = async (recordingId) => {
    if (!confirm("Are you sure you want to delete this recording?")) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5001/api/recordings/${recordingId}`, {
        headers: { Authorization: token }
      });
      await fetchRecordings();
    } catch (err) {
      console.error("Error deleting recording:", err);
      alert("Failed to delete recording");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="relative inline-flex items-center gap-2">
      {/* Recording Button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={uploading}
        className={`px-4 py-2 rounded-2xl text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : uploading
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
        }`}
      >
        {isRecording ? (
          <>
            <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
            🎙️ {formatTime(recordingTime)}
          </>
        ) : uploading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Uploading...
          </>
        ) : (
          <>
            <span>🎙️</span>
            Record
          </>
        )}
      </button>

      {/* View Recordings Button */}
      <button
        onClick={() => {
          setShowRecordings(!showRecordings);
          if (!showRecordings) fetchRecordings();
        }}
        className="px-3 py-2 rounded-2xl text-sm bg-blue-500/20 hover:bg-blue-500/30 transition whitespace-nowrap"
      >
        📁 {recordings.length > 0 && `(${recordings.length})`}
      </button>

      {/* Error Display */}
      {error && (
        <div className="absolute top-full mt-1 left-0 text-xs text-red-400 bg-red-500/20 px-3 py-1 rounded-lg whitespace-nowrap">
          ❌ {error}
        </div>
      )}

      {/* Live Transcript Display (during recording) */}
      {isRecording && liveTranscript && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-blue-500/20 border border-blue-500/30 rounded-xl p-3 z-50 backdrop-blur-sm min-w-[200px]">
          <p className="text-xs text-blue-400 mb-1">🎤 Listening...</p>
          <p className="text-sm text-white truncate">{liveTranscript}</p>
          <p className="text-xs text-green-400 mt-1 animate-pulse">✨ Extracting tasks in real-time</p>
        </div>
      )}

      {/* Recordings List */}
      {showRecordings && (
        <div className="absolute top-full mt-2 right-0 w-80 sm:w-96 bg-[#111827] border border-[#1f2937] rounded-2xl shadow-2xl z-50">
          <div className="p-4 border-b border-[#1f2937] flex justify-between items-center">
            <div>
              <h3 className="font-bold">🎧 Recordings</h3>
              <p className="text-xs text-gray-400">{recordings.length} recordings saved</p>
            </div>
            <button 
              onClick={() => setShowRecordings(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="max-h-64 overflow-y-auto p-2">
            {recordings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-2">🎙️</p>
                <p>No recordings yet</p>
                <p className="text-xs mt-1">Click "Record" to start</p>
              </div>
            ) : (
              recordings.map(rec => (
                <div key={rec._id} className="p-3 border-b border-[#1d2942] hover:bg-[#0b1220] transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {rec.originalName || 'Recording'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(rec.createdAt).toLocaleString()} • {formatSize(rec.size)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <a
                        href={`http://localhost:5001/api/recordings/download/${rec._id}`}
                        download
                        className="text-blue-400 hover:text-blue-300 text-sm"
                        title="Download"
                      >
                        ⬇️
                      </a>
                      <button
                        onClick={() => deleteRecording(rec._id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <audio controls className="w-full mt-2 h-8">
                    <source src={`http://localhost:5001/api/recordings/stream/${rec._id}`} type="audio/webm" />
                    <source src={`http://localhost:5001/api/recordings/stream/${rec._id}`} type="audio/mp4" />
                    Your browser does not support the audio element.
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