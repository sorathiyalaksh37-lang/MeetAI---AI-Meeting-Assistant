import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import GlobalSearch from "./GlobalSearch";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setUserRole(parsedUser.role);
      console.log("User loaded:", parsedUser.name, "Role:", parsedUser.role);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#060b16] text-white">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0d1424] border-r border-[#1b2940] p-6 flex flex-col">
        {/* LOGO */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            🧠 MeetAI
          </h1>
          <p className="text-gray-400 mt-2 text-sm">AI Meeting Assistant</p>
        </div>

        {/* USER INFO */}
        {user && (
          <div className="mb-6 p-3 bg-[#111a2e] rounded-xl">
            <p className="text-xs text-gray-400">Logged in as</p>
            <p className="font-semibold text-sm truncate flex items-center gap-1">
              <span>👤</span> {user.name || user.email}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {userRole === 'admin' ? (
                <span className="inline-block text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  👑 ADMIN
                </span>
              ) : userRole === 'member' ? (
                <span className="inline-block text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  👥 MEMBER
                </span>
              ) : (
                <span className="inline-block text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
                  👁️ VIEWER
                </span>
              )}
            </div>
          </div>
        )}

        {/* NAVIGATION */}
        <nav className="flex flex-col gap-3">
          <Link
            to="/"
            className="bg-[#111a2e] hover:bg-blue-500 transition-all duration-200 p-3 rounded-xl flex items-center gap-3 group"
          >
            <span className="text-xl">📊</span>
            <span>Dashboard</span>
          </Link>
        </nav>

        {/* GLOBAL SEARCH */}
        <div className="mt-6">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Global Search</p>
          <GlobalSearch />
        </div>

        {/* AI CARD */}
        <div className="mt-6 bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30 p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🤖</span>
            <h2 className="text-sm font-bold">AI Powered</h2>
          </div>
          <p className="text-xs text-white/70">
            Real-time meeting intelligence & automation.
          </p>
          <div className="mt-3 flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400">Active</span>
          </div>
        </div>

        {/* LOGOUT BUTTON */}
        <button
          onClick={handleLogout}
          className="mt-auto pt-6 mt-6 text-red-400 hover:text-red-300 transition text-sm flex items-center gap-2"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}