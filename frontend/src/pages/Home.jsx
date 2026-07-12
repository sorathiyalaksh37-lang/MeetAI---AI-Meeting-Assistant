import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "../components/Layout";
import TaskAnalytics from "../components/TaskAnalytics";
import TeamDashboard from "../components/TeamDashboard";
import AdminPanel from "../components/AdminPanel";

export default function Home() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [activeTab, setActiveTab] = useState("meetings");
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ 
    total: 0, 
    active: 0, 
    transcripts: 0, 
    tasks: 0,
    completedTasks: 0,
    pendingTasks: 0
  });

  const getUserInfo = () => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role);
      setUserName(user.name || user.email);
    }
  };

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      const res = await axios.get("http://localhost:5001/api/meetings", {
        headers: { Authorization: token }
      });
      
      setMeetings(res.data);
      
      // Calculate stats
      const total = res.data.length;
      const active = res.data.filter(m => m.status === "active").length;
      const transcripts = res.data.reduce((sum, m) => sum + (m.transcript?.length || 0), 0);
      
      // Calculate tasks from all meetings
      let totalTasks = 0;
      let completedTasks = 0;
      let pendingTasks = 0;
      
      res.data.forEach(meeting => {
        if (meeting.actionItems) {
          meeting.actionItems.forEach(item => {
            totalTasks++;
            if (item.status === 'Completed' || item.completed) {
              completedTasks++;
            } else {
              pendingTasks++;
            }
          });
        }
      });
      
      setStats({ 
        total, 
        active, 
        transcripts, 
        tasks: totalTasks,
        completedTasks,
        pendingTasks
      });
      
      if (res.data.length > 0 && !selectedMeeting) {
        setSelectedMeeting(res.data[0]._id);
      }
    } catch (err) {
      console.error("Error fetching meetings:", err);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUserInfo();
    fetchMeetings();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchMeetings, 30000);
    return () => clearInterval(interval);
  }, []);

  const createMeeting = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post("http://localhost:5001/api/meetings/create", {
        title: `Meeting ${new Date().toLocaleString()}`,
      }, {
        headers: { Authorization: token }
      });
      navigate(`/meeting/${res.data._id}`);
    } catch (err) {
      console.error("Create meeting error:", err);
      alert("Meeting creation failed");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Invalid Date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <div className="spinner mx-auto"></div>
            <p className="mt-5 text-lg font-medium text-gray-400">Loading Dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold gradient-text">
            Welcome back, {userName} 👋
          </h1>
          <p className="text-gray-400 mt-1">
            Here's what's happening with your meetings today
          </p>
        </div>
        <button
          onClick={createMeeting}
          className="btn-primary px-6 py-3 rounded-2xl font-semibold text-white flex items-center gap-2 shadow-lg shadow-indigo-500/25"
        >
          <span className="text-xl">+</span>
          New Meeting
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Total Meetings</p>
            <span className="text-2xl">📅</span>
          </div>
          <p className="text-3xl font-bold mt-2">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.active} active</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Transcripts</p>
            <span className="text-2xl">📝</span>
          </div>
          <p className="text-3xl font-bold mt-2">{stats.transcripts}</p>
          <p className="text-xs text-gray-500 mt-1">Messages captured</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Total Tasks</p>
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-3xl font-bold mt-2">{stats.tasks}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.pendingTasks} pending, {stats.completedTasks} done</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">AI Status</p>
            <span className="text-2xl">🤖</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full pulse-dot"></div>
            <p className="text-sm font-medium text-green-400">Active</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">Real-time intelligence</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#1a2340] overflow-x-auto">
        {[
          { id: "meetings", icon: "📅", label: "Meetings" },
          { id: "analytics", icon: "📊", label: "Analytics" },
          { id: "team", icon: "👥", label: "Team Dashboard" },
          ...(userRole === 'admin' ? [{ id: "admin", icon: "👑", label: "Admin Panel" }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            data-tab={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-t-xl font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[#1a2340] text-indigo-400 border-b-2 border-indigo-500'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Meetings Tab Content */}
      {activeTab === "meetings" && (
        <div id="meetings-section" className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4">Meeting History</h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {meetings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-5xl mb-4">📭</p>
                <p className="text-gray-400">No meetings yet</p>
                <p className="text-sm text-gray-500 mt-1">Click "New Meeting" to get started</p>
              </div>
            ) : (
              meetings.map((meeting) => (
                <div
                  key={meeting._id}
                  onClick={() => navigate(`/meeting/${meeting._id}`)}
                  className="group p-4 rounded-xl bg-[#0a0e1a] border border-[#1a2340] hover:border-indigo-500/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold group-hover:text-indigo-400 transition-colors">
                        {meeting.title || "Untitled Meeting"}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(meeting.createdAt)} • 
                        {meeting.transcript?.length || 0} messages • 
                        {meeting.actionItems?.length || 0} tasks
                      </p>
                    </div>
                    <div className="text-gray-500 group-hover:text-indigo-400 transition-colors">
                      →
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="glass-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold">📊 Task Analytics</h2>
              <p className="text-sm text-gray-400">Visual insights from your meetings</p>
            </div>
            {meetings.length > 0 && (
              <select
                value={selectedMeeting || ""}
                onChange={(e) => setSelectedMeeting(e.target.value)}
                className="px-4 py-2 rounded-xl bg-[#0a0e1a] border border-[#1a2340] text-white focus:border-indigo-500 outline-none"
              >
                {meetings.map(meeting => (
                  <option key={meeting._id} value={meeting._id}>
                    {meeting.title || "Untitled"}
                  </option>
                ))}
              </select>
            )}
          </div>
          {selectedMeeting ? (
            <TaskAnalytics meetingId={selectedMeeting} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No meetings available for analytics</p>
            </div>
          )}
        </div>
      )}

      {/* Team Dashboard Tab */}
      {activeTab === "team" && (
        <div className="glass-card p-6">
          <TeamDashboard />
        </div>
      )}

      {/* Admin Panel Tab */}
      {activeTab === "admin" && userRole === 'admin' && (
        <div className="glass-card p-6">
          <AdminPanel />
        </div>
      )}
    </Layout>
  );
}