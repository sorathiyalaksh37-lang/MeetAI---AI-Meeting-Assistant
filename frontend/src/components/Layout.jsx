import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlobalSearch from "./GlobalSearch";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navItems = [
    { path: "/", icon: "📊", label: "Dashboard", description: "Overview & Stats" },
    { path: "/meetings", icon: "📅", label: "Meetings", description: "All your meetings" },
    { path: "/tasks", icon: "✅", label: "Tasks", description: "Action items" },
  ];

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path) => {
    if (path === "/meetings") {
      navigate('/');
      setTimeout(() => {
        const section = document.getElementById('meetings-section');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else if (path === "/tasks") {
      navigate('/');
      setTimeout(() => {
        const analyticsTab = document.querySelector('[data-tab="analytics"]');
        if (analyticsTab) analyticsTab.click();
      }, 100);
    } else {
      navigate(path);
    }
    setIsMobileMenuOpen(false);
  };

  // Sidebar variants for animation
  const sidebarVariants = {
    expanded: { width: "280px", transition: { duration: 0.3, ease: "easeInOut" } },
    collapsed: { width: "80px", transition: { duration: 0.3, ease: "easeInOut" } },
    mobile: { width: "280px", transition: { duration: 0.3, ease: "easeInOut" } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.3 }
    })
  };

  return (
    <div className="flex min-h-screen bg-[#0a0e1a] text-[#e2e8f0]">
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-[#0f1629] border border-[#1a2340] text-white hover:border-indigo-500 transition-all shadow-lg shadow-black/20"
      >
        <motion.div
          animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </motion.div>
      </button>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        className={`
          bg-gradient-to-b from-[#0f1629] to-[#0a0e1a] border-r border-[#1a2340] p-5 flex flex-col
          fixed lg:relative h-full z-40 overflow-y-auto
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        initial="expanded"
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        style={{ boxShadow: '4px 0 30px rgba(0,0,0,0.3)' }}
      >
        {/* Decorative gradient line at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Logo */}
        <motion.div 
          className="flex items-center justify-between mb-8 px-2 mt-2"
          variants={itemVariants}
          custom={0}
        >
          <motion.div 
            className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}
            layout
          >
            <motion.div 
              className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg shadow-indigo-500/30 flex-shrink-0"
              whileHover={{ scale: 1.05, rotate: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              🧠
            </motion.div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h1 className="text-xl font-bold gradient-text">MeetAI</h1>
                <p className="text-[10px] text-gray-400 tracking-wider">AI MEETING ASSISTANT</p>
              </motion.div>
            )}
          </motion.div>
          <motion.button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isCollapsed ? '→' : '←'}
          </motion.button>
        </motion.div>

        {/* User Info */}
        {user && (
          <motion.div 
            className={`mb-6 p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 ${isCollapsed ? 'text-center' : ''}`}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <AnimatePresence>
              {!isCollapsed ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Logged in as</p>
                  <div className="flex items-center gap-3 mt-2">
                    <motion.div 
                      className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-indigo-500/20 flex-shrink-0"
                      whileHover={{ scale: 1.1 }}
                    >
                      {user.name?.charAt(0) || 'U'}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{user.name || user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {user.role === 'admin' ? (
                          <span className="badge badge-success">👑 Admin</span>
                        ) : user.role === 'member' ? (
                          <span className="badge badge-info">👥 Member</span>
                        ) : (
                          <span className="badge">👁️ Viewer</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full pulse-dot"></div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item, index) => (
            <motion.button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              onMouseEnter={() => setHoveredItem(item.path)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`
                sidebar-link flex items-center gap-3 px-3 py-3 rounded-xl transition-all w-full text-left
                ${isActive(item.path) ? 'sidebar-link-active' : 'hover:bg-white/5'}
                ${isCollapsed ? 'justify-center' : ''}
                relative overflow-hidden
              `}
              title={isCollapsed ? item.label : ''}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Active indicator bar */}
              {isActive(item.path) && (
                <motion.div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full"
                  layoutId="activeBar"
                  transition={{ duration: 0.3 }}
                />
              )}
              
              {/* Icon with glow */}
              <motion.span 
                className="text-xl flex-shrink-0 relative"
                whileHover={{ scale: 1.1, rotate: -5 }}
              >
                {item.icon}
                {isActive(item.path) && (
                  <motion.span 
                    className="absolute inset-0 rounded-full blur-md bg-indigo-500/20"
                    layoutId="glow"
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.span>
              
              {!isCollapsed && (
                <motion.div 
                  className="flex-1 min-w-0"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <span className="text-sm font-medium block">{item.label}</span>
                  <span className="text-[10px] text-gray-500 block truncate">{item.description}</span>
                </motion.div>
              )}
              
              {isActive(item.path) && !isCollapsed && (
                <motion.span 
                  className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}

              {/* Hover background effect */}
              {hoveredItem === item.path && !isActive(item.path) && (
                <motion.div 
                  className="absolute inset-0 bg-white/5 rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </motion.button>
          ))}
        </nav>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#1a2340]"></div>
          </div>
          {!isCollapsed && (
            <motion.div 
              className="relative flex justify-center text-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="px-3 bg-[#0f1629] text-gray-500">Tools</span>
            </motion.div>
          )}
        </div>

        {/* Global Search */}
        {!isCollapsed && (
          <motion.div 
            className="mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span>🔍</span> Global Search
            </p>
            <GlobalSearch />
          </motion.div>
        )}

        {/* AI Status with animation */}
        <motion.div 
          className={`rounded-2xl p-4 mb-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 ${isCollapsed ? 'text-center' : ''}`}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="relative">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full pulse-dot"></div>
              <motion.div 
                className="absolute inset-0 rounded-full bg-green-400"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ opacity: 0.3 }}
              />
            </div>
            {!isCollapsed && (
              <div>
                <p className="text-xs font-medium flex items-center gap-1">
                  AI Active
                  <span className="text-[10px] text-green-400">●</span>
                </p>
                <p className="text-[10px] text-gray-400">Real-time intelligence</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Logout Button */}
        <motion.button
          onClick={handleLogout}
          className={`
            flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all
            ${isCollapsed ? 'justify-center' : ''}
            relative overflow-hidden
          `}
          title={isCollapsed ? 'Logout' : ''}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-xl flex-shrink-0">🚪</span>
          {!isCollapsed && (
            <motion.span 
              className="text-sm font-medium"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              Logout
            </motion.span>
          )}
        </motion.button>

        {/* Footer version */}
        {!isCollapsed && (
          <motion.div 
            className="mt-4 pt-4 border-t border-[#1a2340] text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-[10px] text-gray-500">v1.0.0 • Made By Laksh</p>
          </motion.div>
        )}
      </motion.aside>

      {/* Main Content */}
      <motion.main 
        className={`flex-1 p-4 md:p-8 transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-0'} w-full`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </motion.main>
    </div>
  );
}