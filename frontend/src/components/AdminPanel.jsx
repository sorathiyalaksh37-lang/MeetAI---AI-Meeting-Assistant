import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    };
  };

  useEffect(() => {
    fetchAdminData();
    getCurrentUser();
  }, []);

  const getCurrentUser = () => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUser(user);
      console.log("Current user:", user);
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError("Please login again");
        setLoading(false);
        return;
      }
      
      // Fetch users
      const usersRes = await axios.get('http://localhost:5001/api/admin/users', {
        headers: { 'Authorization': token }
      });
      
      console.log("Users fetched:", usersRes.data);
      setUsers(usersRes.data);
      
      // Fetch stats
      const statsRes = await axios.get('http://localhost:5001/api/admin/stats', {
        headers: { 'Authorization': token }
      });
      
      console.log("Stats fetched:", statsRes.data);
      setStats(statsRes.data);
      
    } catch (err) {
      console.error("Error fetching admin data:", err);
      
      if (err.response?.status === 403) {
        setError("Admin access required. You don't have permission to view this page.");
      } else if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
      } else {
        setError(err.response?.data?.error || "Failed to load admin data");
      }
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    setUpdating(userId);
    
    try {
      const token = localStorage.getItem('token');
      console.log("Updating user:", userId, "to role:", newRole);
      
      const response = await axios.put(
        `http://localhost:5001/api/admin/users/${userId}/role`,
        { role: newRole },
        { headers: { 'Authorization': token } }
      );
      
      console.log("Update response:", response.data);
      
      if (response.data.success) {
        // Refresh users list
        await fetchAdminData();
        
        // If the updated user is the current user, update localStorage and reload
        const updatedUser = users.find(u => u._id === userId);
        if (updatedUser && updatedUser.email === currentUser?.email) {
          const userData = localStorage.getItem("user");
          if (userData) {
            const user = JSON.parse(userData);
            user.role = newRole;
            localStorage.setItem("user", JSON.stringify(user));
          }
          alert(`Your role has been updated to ${newRole.toUpperCase()}. The page will reload to apply changes.`);
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          alert(`User role updated to ${newRole.toUpperCase()}`);
        }
      } else {
        alert(response.data.message || response.data.error || "Failed to update role");
      }
      
    } catch (err) {
      console.error("Error updating role:", err);
      console.error("Response:", err.response?.data);
      
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message;
      alert("Error updating role: " + errorMessage);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-24 bg-gray-700 rounded"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="text-xl font-bold text-red-400 mb-2">Access Denied</h3>
        <p className="text-gray-400">{error}</p>
        <button 
          onClick={fetchAdminData}
          className="mt-4 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-xl text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{stats.totalUsers}</p>
              <p className="text-xs text-gray-400">Total Users</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{stats.totalMeetings}</p>
              <p className="text-xs text-gray-400">Meetings</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{stats.totalTasks}</p>
              <p className="text-xs text-gray-400">Tasks</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{stats.completionRate}%</p>
              <p className="text-xs text-gray-400">Completion Rate</p>
            </div>
            <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-red-400">
                {stats.totalTasks - (stats.completedTasks || 0)}
              </p>
              <p className="text-xs text-gray-400">Pending</p>
            </div>
          </div>

          {/* Role Breakdown */}
          <div className="bg-[#0b1220] rounded-2xl p-4">
            <h4 className="text-sm font-semibold mb-2">📊 Role Breakdown</h4>
            <div className="flex gap-6 text-sm">
              <span className="text-red-400">👑 Admin: {stats.roleBreakdown?.admin || 0}</span>
              <span className="text-blue-400">👥 Member: {stats.roleBreakdown?.member || 0}</span>
              <span className="text-gray-400">👁️ Viewer: {stats.roleBreakdown?.viewer || 0}</span>
            </div>
          </div>
        </>
      )}

      {/* Users Management Table */}
      <div className="overflow-x-auto">
        <h3 className="text-xl font-bold mb-4">👥 User Management</h3>
        
        {users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No users found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#0b1220] border-b border-[#1d2942]">
              <tr>
                <th className="text-left p-4 text-gray-400 font-medium">Name</th>
                <th className="text-left p-4 text-gray-400 font-medium">Email</th>
                <th className="text-left p-4 text-gray-400 font-medium">Current Role</th>
                <th className="text-left p-4 text-gray-400 font-medium">Joined</th>
                <th className="text-left p-4 text-gray-400 font-medium">Change Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const isCurrentUser = user.email === currentUser?.email;
                return (
                  <tr key={user._id} className="border-b border-[#1d2942] hover:bg-[#0b1220] transition">
                    <td className="p-4 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">👤</span>
                        {user.name}
                        {isCurrentUser && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">(You)</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">{user.email}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : user.role === 'member'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {user.role === 'admin' ? '👑 Admin' : user.role === 'member' ? '👥 Member' : '👁️ Viewer'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user._id, e.target.value)}
                          disabled={updating === user._id}
                          className="bg-[#0b1220] border border-[#1d2942] rounded-lg p-2 text-sm cursor-pointer hover:border-blue-500 transition disabled:opacity-50"
                        >
                          <option value="admin">👑 Admin</option>
                          <option value="member">👥 Member</option>
                          <option value="viewer">👁️ Viewer</option>
                        </select>
                        {updating === user._id && (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>
                      {isCurrentUser && (
                        <p className="text-xs text-gray-500 mt-1">Changing your own role</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}