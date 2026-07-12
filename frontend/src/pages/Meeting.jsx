import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

import socket from "../socket";
import Layout from "../components/Layout";
import MicrophoneButton from "../components/MicrophoneButton";
import MeetingSummary from "../components/MeetingSummary";
import MeetingSearch from "../components/MeetingSearch";
import CalendarSync from "../components/CalendarSync";
import RecordingRecorder from "../components/RecordingRecorder";

export default function Meeting() {
  const { id } = useParams();
  const [text, setText] = useState("");
  const [transcript, setTranscript] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const transcriptEndRef = useRef(null);
  const transcriptContainerRef = useRef(null);

  // =========================
  // FETCH MEETING DATA
  // =========================
  const fetchMeeting = async () => {
    try {
      setFetchError(null);
      console.log("Fetching meeting:", id);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("No token found");
        setFetchError("Please login again");
        return;
      }
      
      const res = await axios.get(
        `http://localhost:5001/api/meetings/${id}`,
        { headers: { Authorization: token } }
      );
      
      console.log("Meeting data:", res.data);
      setTranscript(res.data.transcript || []);
      
      setSummary({
        summary: res.data.aiSummary,
        decisions: res.data.decisions || [],
        risks: res.data.risks || []
      });
      
      try {
        const tasksRes = await axios.get(
          `http://localhost:5001/api/tasks/meeting/${id}`,
          { headers: { Authorization: token } }
        );
        
        console.log("Tasks from API:", tasksRes.data);
        setTasks(tasksRes.data || []);
        
        if (tasksRes.data.length === 0) {
          console.log("No tasks found for this meeting");
        }
      } catch (taskErr) {
        console.error("Error fetching tasks:", taskErr);
        setTasks([]);
      }
      
    } catch (err) {
      console.error("Error fetching meeting:", err);
      if (err.response?.status === 403) {
        setFetchError("You don't have access to this meeting");
      } else if (err.response?.status === 404) {
        setFetchError("Meeting not found");
      } else {
        setFetchError("Error loading meeting");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeeting();
  }, [id]);

  // Auto-scroll to bottom when new transcript arrives
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }
  }, [transcript]);

  // =========================
  // SOCKET CONNECTION
  // =========================
  useEffect(() => {
    socket.emit("join-meeting", id);

    socket.on("receive-transcript", (data) => {
      setTranscript((prev) => [...prev, data]);
    });

    socket.on("new-task", (task) => {
      if (!task) return;
      console.log("New task received:", task);
      setTasks((prev) => {
        const exists = prev.find((t) => t._id === task._id);
        if (exists) return prev;
        return [...prev, task];
      });
    });

    socket.on("meeting-summary-updated", (updatedSummary) => {
      console.log("Summary updated:", updatedSummary);
      setSummary(updatedSummary);
    });

    return () => {
      socket.off("receive-transcript");
      socket.off("new-task");
      socket.off("meeting-summary-updated");
    };
  }, [id]);

  // =========================
  // SEND MESSAGE
  // =========================
  const sendMessage = async () => {
    if (!text.trim()) return;
    
    setSending(true);
    
    socket.emit("send-transcript", {
      meetingId: id,
      text,
      sender: "You",
    });
    
    setText("");
    
    setTimeout(() => {
      setSending(false);
    }, 800);
  };

  // =========================
  // HANDLE VOICE INPUT
  // =========================
  const handleVoiceInput = (voiceText) => {
    console.log("Voice input received:", voiceText);
    setText(prev => {
      const newText = prev ? prev + " " + voiceText : voiceText;
      return newText;
    });
  };

  // =========================
  // JUMP TO MESSAGE
  // =========================
  const jumpToMessage = (index) => {
    const messageElement = document.getElementById(`transcript-message-${index}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('bg-yellow-500/30', 'transition-all', 'duration-300');
      setTimeout(() => {
        messageElement.classList.remove('bg-yellow-500/30');
      }, 2000);
    }
  };

  // =========================
  // COMPLETE TASK
  // =========================
  const completeTask = async (taskId) => {
    console.log("🔘 Complete button clicked for task:", taskId);
    
    if (!taskId) {
      console.error("No task ID provided");
      alert("Error: No task ID found");
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5001/api/tasks/${taskId}/complete`,
        {},
        { headers: { Authorization: token } }
      );
      
      console.log("Response:", response.data);
      
      if (response.data.success && response.data.task) {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task._id === taskId ? response.data.task : task
          )
        );
        console.log("✅ Task status updated successfully");
      } else {
        console.error("Unexpected response:", response.data);
        alert("Failed to update task status");
      }
      
    } catch (error) {
      console.error("❌ Error details:", error);
      
      if (error.response?.status === 404) {
        alert("Task not found. Please refresh the page.");
        fetchMeeting();
      } else {
        alert(`Error: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  // =========================
  // DELETE TASK
  // =========================
  const deleteTask = async (taskId) => {
    console.log("🗑️ Delete button clicked for task:", taskId);
    
    if (!taskId) {
      console.error("No task ID provided");
      return;
    }
    
    const confirmDelete = window.confirm("Are you sure you want to delete this task?");
    if (!confirmDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:5001/api/tasks/${taskId}`,
        { headers: { Authorization: token } }
      );
      
      console.log("Delete response:", response.data);
      
      if (response.data.success) {
        setTasks(prevTasks => 
          prevTasks.filter(task => task._id !== taskId)
        );
        console.log("✅ Task deleted successfully");
      } else {
        alert("Failed to delete task");
      }
      
    } catch (error) {
      console.error("❌ Delete error:", error);
      
      if (error.response?.status === 404) {
        alert("Task not found. It may have been already deleted.");
        fetchMeeting();
      } else {
        alert(`Error deleting task: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  // =========================
  // DEBUG FUNCTION
  // =========================
  const debugTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5001/api/tasks/debug/${id}`, {
        headers: { Authorization: token }
      });
      console.log("Debug - All tasks in DB:", res.data);
      alert(`Found ${res.data.count} tasks in database for this meeting`);
    } catch (err) {
      console.error("Debug error:", err);
      alert("Error checking tasks: " + (err.response?.data?.error || err.message));
    }
  };

  // =========================
  // LOADING SCREEN
  // =========================
  if (loading) {
    return (
      <Layout>
        <div className="h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-5 text-lg font-medium text-gray-400">Loading Meeting...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // =========================
  // ERROR SCREEN
  // =========================
  if (fetchError) {
    return (
      <Layout>
        <div className="h-[80vh] flex items-center justify-center">
          <div className="text-center bg-red-500/10 border border-red-500/30 rounded-3xl p-8 max-w-md">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h2>
            <p className="text-gray-400">{fetchError}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 bg-indigo-500 hover:bg-indigo-600 px-6 py-2 rounded-xl transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* TOP HEADER - Professional */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">🧠 AI Meeting Assistant</h1>
          <p className="text-sm text-gray-400 mt-1">Smart real-time collaboration with voice AI</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-500 font-mono bg-[#0a0e1a] px-3 py-1 rounded-lg border border-[#1a2340]">
              📋 Meeting ID: {id}
            </span>
            <span className="text-xs flex items-center gap-1 text-green-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full pulse-dot"></span>
              Live
            </span>
          </div>
        </div>
        
        {/* Header Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <RecordingRecorder 
            meetingId={id} 
            onRecordingComplete={() => {
              console.log("Recording saved");
              fetchMeeting();
            }}
            socket={socket}
          />
          <button
            onClick={debugTasks}
            className="px-3 py-2 rounded-xl bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition text-xs font-medium border border-yellow-500/20"
          >
            🔍 Debug
          </button>
          <a
            href={`http://localhost:5001/api/report/${id}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition text-xs font-medium border border-purple-500/20"
          >
            📄 Export PDF
          </a>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="mb-6">
        <MeetingSearch meetingId={id} onJumpToMessage={jumpToMessage} />
      </div>

      {/* AI SUMMARY SECTION */}
      <div className="mb-6">
        <MeetingSummary 
          meetingId={id} 
          initialSummary={summary}
        />
      </div>

      {/* MAIN GRID - Professional Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ height: 'calc(100vh - 480px)', minHeight: '500px' }}>
        
        {/* LEFT SIDE - TRANSCRIPT */}
        <div className="glass-card p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>🎤</span> Live Transcript
                <span className="text-xs font-normal text-gray-500 bg-[#0a0e1a] px-2 py-0.5 rounded-full">Real-time</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Messages appear instantly as they're spoken</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full pulse-dot"></div>
              <span className="text-xs text-green-400 font-medium">Live</span>
              <span className="text-xs text-green-400/60">{transcript.length} messages</span>
            </div>
          </div>

          {/* Transcript Container */}
          <div 
            ref={transcriptContainerRef}
            className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0"
            style={{ maxHeight: '100%' }}
          >
            {transcript.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <div className="w-20 h-20 rounded-full bg-[#0a0e1a] border-2 border-dashed border-[#1a2340] flex items-center justify-center text-4xl mb-4">
                  🎙️
                </div>
                <p className="text-sm font-medium text-gray-400">Start the conversation</p>
                <p className="text-xs text-gray-500 mt-1">Speak or type to begin your meeting</p>
                <div className="flex gap-2 mt-4">
                  <span className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full">💡 Voice input available</span>
                  <span className="text-xs bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full">🎯 AI extracts tasks</span>
                </div>
              </div>
            ) : (
              <>
                {transcript.map((t, i) => (
                  <div 
                    key={i} 
                    id={`transcript-message-${i}`} 
                    className="p-3 rounded-xl bg-[#0a0e1a] border border-[#1a2340] hover:border-indigo-500/30 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                          {t.sender?.charAt(0) || 'U'}
                        </span>
                        <span className="text-indigo-400 font-medium text-sm">{t.sender}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {t.time ? new Date(t.time).toLocaleTimeString() : 'Just now'}
                      </span>
                    </div>
                    <p className="mt-2 text-gray-200 leading-relaxed text-sm pl-8">{t.text}</p>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </>
            )}
          </div>

          {/* INPUT SECTION */}
          <div className="flex gap-2 mt-4 flex-shrink-0">
            <div className="flex-1 relative">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
                placeholder="Type your message or use voice input..."
                className="w-full px-4 py-3 pr-10 rounded-xl bg-[#0a0e1a] border border-[#1a2340] text-white placeholder-gray-500 focus:border-indigo-500 outline-none transition text-sm"
              />
              {text && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  {text.length}
                </span>
              )}
            </div>
            
            <MicrophoneButton 
              onTranscriptReady={handleVoiceInput}
              onListeningChange={(listening) => console.log("Listening:", listening)}
            />
            
            <button
              onClick={sendMessage}
              disabled={sending}
              className={`px-6 rounded-xl font-medium transition text-sm ${
                sending ? "bg-gray-700 cursor-not-allowed" : "btn-primary text-white"
              }`}
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Sending
                </span>
              ) : (
                "Send →"
              )}
            </button>
          </div>
        </div>

        {/* RIGHT SIDE - TASKS */}
        <div className="glass-card p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>⚡</span> AI Action Items
                <span className="text-xs font-normal text-gray-500 bg-[#0a0e1a] px-2 py-0.5 rounded-full">Auto-extracted</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Tasks detected from meeting conversation</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
              </span>
            </div>
          </div>

          {/* Tasks Container */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
            {tasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <div className="w-20 h-20 rounded-full bg-[#0a0e1a] border-2 border-dashed border-[#1a2340] flex items-center justify-center text-4xl mb-4">
                  🤖
                </div>
                <p className="text-sm font-medium text-gray-400">Waiting for action items</p>
                <p className="text-xs text-gray-500 mt-1 text-center max-w-xs">
                  AI will automatically detect tasks when you speak
                </p>
                <div className="flex flex-col items-center gap-2 mt-4">
                  <div className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full">
                    💡 Try: "Kali complete the file by tomorrow"
                  </div>
                  <button
                    onClick={() => {
                      setText("Kali complete the file process by tomorrow");
                    }}
                    className="text-xs bg-indigo-500/20 hover:bg-indigo-500/30 px-4 py-1.5 rounded-lg transition text-indigo-400 border border-indigo-500/20"
                  >
                    📝 Quick Test Message
                  </button>
                </div>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task._id}
                  className={`p-4 rounded-xl border transition-all ${
                    task?.status === "Completed"
                      ? "border-green-500/30 bg-green-500/5 hover:border-green-500/50"
                      : "border-[#1a2340] bg-[#0a0e1a] hover:border-indigo-500/30"
                  }`}
                >
                  {/* Task Header */}
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-white text-sm flex-1">
                      {task?.task || "Untitled Task"}
                    </h3>
                    <span className={`badge ml-2 flex-shrink-0 ${
                      task?.status === "Completed" ? "badge-success" : "badge-warning"
                    }`}>
                      {task?.status === "Completed" ? "✅ Done" : "⏳ Pending"}
                    </span>
                  </div>
                  
                  {/* Task Details */}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <span>👤</span> {task?.assignedTo || "Unassigned"}
                    </span>
                    <span className="flex items-center gap-1">
                      <span>📅</span> {task?.dueDate || "No deadline"}
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-1.5 mt-3 pt-3 border-t border-[#1a2340]">
                    <button
                      onClick={() => completeTask(task._id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        task?.status === "Completed"
                          ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/20"
                          : "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/20"
                      }`}
                    >
                      {task?.status === "Completed" ? "↩️ Undo" : "✅ Mark Complete"}
                    </button>
                    
                    <button
                      onClick={() => deleteTask(task._id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition border border-red-500/20"
                    >
                      🗑️ Delete
                    </button>
                    
                    <CalendarSync 
                      taskId={task._id} 
                      taskName={task.task} 
                      dueDate={task.dueDate} 
                    />
                  </div>
                  
                  {/* Completed Date */}
                  {task?.completedAt && (
                    <p className="text-xs text-green-400 mt-2 pt-2 border-t border-green-500/20">
                      ✅ Completed on {new Date(task.completedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}