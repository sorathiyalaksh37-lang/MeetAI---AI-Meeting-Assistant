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

  // LOAD MEETINGS
  useEffect(() => {
    fetchMeetings();
    getUserInfo();
  }, []);

  // GET USER INFO FROM LOCALSTORAGE
  const getUserInfo = () => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role);
      setUserName(user.name || user.email);
      console.log("User role from localStorage:", user.role);
    }
  };

  // FETCH ALL MEETINGS
  const fetchMeetings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get("http://localhost:5001/api/meetings", {
        headers: { Authorization: token }
      });
      setMeetings(res.data);
      if (res.data.length > 0 && !selectedMeeting) {
        setSelectedMeeting(res.data[0]._id);
      }
    } catch (err) {
      console.log(err);
    }
  };

  // CREATE NEW MEETING
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
      console.log(err);
      alert("Meeting creation failed");
    }
  };

  return (
    <Layout>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            AI Meeting Dashboard
          </h1>
          <p className="text-gray-400 mt-2">
            Real-time meeting intelligence, analytics & collaboration.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-500">Welcome,</span>
            <span className="text-sm font-semibold text-white">{userName}</span>
            {userRole === 'admin' && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                👑 Admin Access
              </span>
            )}
          </div>
        </div>
        <button
          onClick={createMeeting}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition px-6 py-3 rounded-2xl font-semibold"
        >
          + New Meeting
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6 border-b border-[#1d2942] overflow-x-auto">
        <button
          onClick={() => setActiveTab("meetings")}
          className={`px-6 py-3 rounded-t-xl font-semibold transition whitespace-nowrap ${
            activeTab === "meetings"
              ? "bg-[#111827] text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          📅 Meetings
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-6 py-3 rounded-t-xl font-semibold transition whitespace-nowrap ${
            activeTab === "analytics"
              ? "bg-[#111827] text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          📊 Analytics
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`px-6 py-3 rounded-t-xl font-semibold transition whitespace-nowrap ${
            activeTab === "team"
              ? "bg-[#111827] text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          👥 Team Dashboard
        </button>
        {userRole === 'admin' && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`px-6 py-3 rounded-t-xl font-semibold transition whitespace-nowrap ${
              activeTab === "admin"
                ? "bg-[#111827] text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            👑 Admin Panel
          </button>
        )}
      </div>

      {/* MEETINGS TAB */}
      {activeTab === "meetings" && (
        <>
          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-2xl p-5">
              <p className="text-gray-300 text-sm">Total Meetings</p>
              <h2 className="text-3xl font-bold mt-2">{meetings.length}</h2>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-2xl p-5">
              <p className="text-gray-300 text-sm">Active Meetings</p>
              <h2 className="text-3xl font-bold mt-2">
                {meetings.filter(m => m.status === "active").length}
              </h2>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-2xl p-5">
              <p className="text-gray-300 text-sm">Total Transcripts</p>
              <h2 className="text-3xl font-bold mt-2">
                {meetings.reduce((sum, m) => sum + (m.transcript?.length || 0), 0)}
              </h2>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-2xl p-5">
              <p className="text-gray-300 text-sm">AI Status</p>
              <h2 className="text-xl font-bold mt-2 text-green-400">● Active</h2>
            </div>
          </div>

          {/* MEETING LIST */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">Meeting History</h2>
            <div className="space-y-3">
              {meetings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-2">📭</p>
                  <p>No meetings yet. Click "New Meeting" to start!</p>
                </div>
              ) : (
                meetings.map((meeting) => (
                  <div
                    key={meeting._id}
                    onClick={() => navigate(`/meeting/${meeting._id}`)}
                    className="bg-[#0b1220] border border-[#1d2942] hover:border-blue-500 transition-all duration-200 rounded-xl p-4 cursor-pointer group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold group-hover:text-blue-400 transition">
                          {meeting.title}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">
                          {meeting.createdAt ? new Date(meeting.createdAt).toLocaleString() : 'Invalid Date'} • 
                          {meeting.transcript?.length || 0} messages • 
                          {meeting.actionItems?.length || 0} tasks
                        </p>
                      </div>
                      <div className="text-gray-500 group-hover:text-blue-400 transition">
                        →
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === "analytics" && (
        <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">📊 Task Analytics</h2>
              <p className="text-gray-400 text-sm mt-1">Visual insights from your meetings</p>
            </div>
            {meetings.length > 0 && (
              <select
                value={selectedMeeting || ""}
                onChange={(e) => setSelectedMeeting(e.target.value)}
                className="bg-[#0b1220] border border-[#1d2942] rounded-xl p-2 text-white"
              >
                {meetings.map(meeting => (
                  <option key={meeting._id} value={meeting._id}>
                    {meeting.title}
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

      {/* TEAM DASHBOARD TAB */}
      {activeTab === "team" && (
        <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6">
          <TeamDashboard />
        </div>
      )}

      {/* ADMIN PANEL TAB */}
      {activeTab === "admin" && userRole === 'admin' && (
        <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6">
          <AdminPanel />
        </div>
      )}
    </Layout>
  );
}