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
      
      // Fetch meeting data
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
      
      // Fetch tasks separately with better error handling
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
        // Don't fail the whole page if tasks fail
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
            <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-5 text-xl font-semibold">Loading Meeting...</p>
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
              className="mt-4 bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-xl transition"
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
      {/* TOP HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white">🧠 AI Meeting Assistant</h1>
          <p className="text-gray-400 mt-1 text-sm">Smart real-time collaboration with voice AI</p>
          <p className="text-gray-500 text-xs mt-1 break-all">Meeting ID: {id}</p>
        </div>
        
        {/* Header Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <RecordingRecorder 
            meetingId={id} 
            onRecordingComplete={() => {
              console.log("Recording saved");
              fetchMeeting(); // Refresh tasks after recording
            }}
            socket={socket}
          />
          <button
            onClick={debugTasks}
            className="bg-yellow-600 hover:bg-yellow-700 transition px-3 py-2 rounded-2xl font-semibold text-xs whitespace-nowrap"
          >
            🔍 Debug
          </button>
          <a
            href={`http://localhost:5001/api/report/${id}`}
            target="_blank"
            rel="noreferrer"
            className="bg-purple-600 hover:bg-purple-700 transition px-3 py-2 rounded-2xl font-semibold text-xs whitespace-nowrap"
          >
            📄 PDF
          </a>
        </div>
      </div>

      {/* SEARCH BAR */}
      <MeetingSearch meetingId={id} onJumpToMessage={jumpToMessage} />

      {/* AI SUMMARY SECTION */}
      <MeetingSummary 
        meetingId={id} 
        initialSummary={summary}
      />

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ height: 'calc(100vh - 380px)' }}>
        {/* LEFT SIDE - TRANSCRIPT */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-3xl p-4 flex flex-col shadow-2xl min-h-0">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold">🎤 Live Transcript</h2>
              <p className="text-gray-400 text-xs mt-0.5">Real-time meeting discussion</p>
            </div>
            <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-full flex-shrink-0">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-xs">Live</span>
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
                <div className="text-5xl mb-3">🎙️</div>
                <p className="text-sm">Start meeting conversation...</p>
                <p className="text-xs mt-1">Try voice input or type a message</p>
              </div>
            ) : (
              <>
                {transcript.map((t, i) => (
                  <div 
                    key={i} 
                    id={`transcript-message-${i}`}
                    className="bg-[#0b1220] border border-[#1d2942] p-3 rounded-xl transition-all duration-300 hover:border-blue-500/50 flex-shrink-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-semibold text-sm">{t.sender}</span>
                      <span className="text-xs text-gray-500">
                        {t.time ? new Date(t.time).toLocaleTimeString() : 'Just now'}
                      </span>
                    </div>
                    <p className="mt-2 text-gray-200 leading-relaxed text-sm">{t.text}</p>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </>
            )}
          </div>

          {/* INPUT SECTION */}
          <div className="flex gap-2 mt-4 flex-shrink-0">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Type meeting discussion or use voice input..."
              className="flex-1 bg-[#0b1220] border border-[#1d2942] rounded-xl p-3 outline-none focus:border-blue-500 text-white text-sm min-w-0"
            />
            
            <MicrophoneButton 
              onTranscriptReady={handleVoiceInput}
              onListeningChange={(listening) => console.log("Listening:", listening)}
            />
            
            <button
              onClick={sendMessage}
              disabled={sending}
              className={`px-4 rounded-xl font-semibold transition whitespace-nowrap text-sm ${
                sending ? "bg-gray-600" : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>

        {/* RIGHT SIDE - TASKS */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-3xl p-4 flex flex-col shadow-2xl min-h-0">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold">⚡ AI Action Items</h2>
              <p className="text-gray-400 text-xs mt-0.5">Auto-generated tasks by AI</p>
            </div>
            <div className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full text-xs flex-shrink-0">
              {tasks.length} Tasks
            </div>
          </div>

          {/* Tasks Container */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
            {tasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <div className="text-5xl mb-3">🤖</div>
                <p className="text-sm">AI is waiting for action items...</p>
                <p className="text-xs mt-1">Try saying: "Kali complete the file process by tomorrow"</p>
                <p className="text-xs text-blue-400 mt-1">💡 Tip: Click "Record" and speak naturally!</p>
                <button
                  onClick={() => {
                    // Test task creation
                    setText("Kali complete the file process by tomorrow");
                  }}
                  className="mt-3 text-xs bg-blue-500/20 hover:bg-blue-500/30 px-3 py-1 rounded-lg transition"
                >
                  📝 Try Test Message
                </button>
              </div>
            ) : (
              tasks.map((task, i) => (
                <div
                  key={task._id || i}
                  className={`rounded-xl p-4 border transition-all duration-200 flex-shrink-0 ${
                    task?.status === "Completed"
                      ? "border-green-500 bg-green-500/10"
                      : "border-[#1d2942] bg-[#0b1220] hover:border-blue-500/50"
                  }`}
                >
                  {/* Task Title */}
                  <h3 className="text-base font-semibold text-white">{task?.task || "Untitled Task"}</h3>
                  
                  {/* Assigned To */}
                  <p className="text-gray-400 mt-2 flex items-center gap-1 text-sm">
                    <span>👤</span> {task?.assignedTo || "Unassigned"}
                  </p>
                  
                  {/* Due Date */}
                  <p className="text-gray-400 mt-0.5 flex items-center gap-1 text-sm">
                    <span>📅</span> {task?.dueDate || "No deadline"}
                  </p>
                  
                  {/* Status Badge and Buttons */}
                  <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                    {/* Status Badge */}
                    <span
                      className={`text-xs px-3 py-1 rounded-full ${
                        task?.status === "Completed"
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                      }`}
                    >
                      {task?.status === "Completed" ? "✅ Completed" : "⏳ Pending"}
                    </span>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => completeTask(task._id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          task?.status === "Completed"
                            ? "bg-orange-500 hover:bg-orange-600 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                      >
                        {task?.status === "Completed" ? "↩️ Undo" : "✅ Complete"}
                      </button>
                      
                      <button
                        onClick={() => deleteTask(task._id)}
                        className="bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg text-xs font-semibold transition text-white"
                      >
                        🗑️
                      </button>
                      
                      <CalendarSync 
                        taskId={task._id} 
                        taskName={task.task} 
                        dueDate={task.dueDate} 
                      />
                    </div>
                  </div>
                  
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