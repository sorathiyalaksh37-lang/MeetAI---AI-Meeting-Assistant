import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function TeamDashboard() {
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberTasks, setMemberTasks] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/analytics/team-dashboard');
      setTeamData(res.data);
    } catch (err) {
      console.error("Error fetching team data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberTasks = async (memberName) => {
    try {
      const res = await axios.get(`http://localhost:5001/api/analytics/user/${encodeURIComponent(memberName)}`);
      setMemberTasks(res.data);
      setSelectedMember(memberName);
    } catch (err) {
      console.error("Error fetching member tasks:", err);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#111827] border border-[#1f2937] rounded-3xl p-6 animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!teamData || teamData.team.length === 0) {
    return (
      <div className="bg-[#111827] border border-[#1f2937] rounded-3xl p-6 text-center">
        <div className="text-6xl mb-4">👥</div>
        <h3 className="text-xl font-bold mb-2">No Team Members Yet</h3>
        <p className="text-gray-400">Assign tasks to team members to see dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">👥 Team Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">
            {teamData.totalMembers} members • {teamData.totalTasks} total tasks
          </p>
        </div>
        <div className="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-sm">
          Updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamData.team.map((member, idx) => (
          <div
            key={idx}
            onClick={() => fetchMemberTasks(member.name)}
            className={`bg-gradient-to-br from-[#0b1220] to-[#111827] border rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
              selectedMember === member.name
                ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                : 'border-[#1d2942] hover:border-blue-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-3xl">
                  {member.completionRate >= 80 ? '🏆' : member.completionRate >= 50 ? '📈' : '📚'}
                </span>
                <h3 className="text-lg font-bold text-white">{member.name}</h3>
              </div>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                {member.meetingsCount} meetings
              </span>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{member.pending}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{member.completed}</p>
                <p className="text-xs text-gray-500">Done</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{member.overdue}</p>
                <p className="text-xs text-gray-500">Overdue</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Completion</span>
                <span>{member.completionRate}%</span>
              </div>
              <div className="h-2 bg-[#1d2942] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${member.completionRate}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Member Tasks Modal */}
      {selectedMember && memberTasks && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMember(null)}>
          <div className="bg-[#111827] border border-[#1d2942] rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-5 border-b border-[#1d2942]">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">{memberTasks.user}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {memberTasks.summary.total} tasks • {memberTasks.summary.completionRate}% completion
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Tasks List */}
            <div className="overflow-y-auto max-h-[60vh] p-5 space-y-3">
              {memberTasks.tasks.map((task, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    navigate(`/meeting/${task.meetingId?._id}`);
                    setSelectedMember(null);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    task.status === 'Completed'
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-[#1d2942] bg-[#0b1220] hover:border-blue-500/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{task.task}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        📄 {task.meetingTitle}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.status === 'Completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {task.status}
                      </span>
                      {task.dueDate && task.dueDate !== 'No deadline' && (
                        <p className="text-xs text-gray-500 mt-1">
                          📅 {task.dueDate}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}