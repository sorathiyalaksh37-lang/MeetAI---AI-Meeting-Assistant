import { useState, useEffect } from 'react';
import axios from 'axios';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

export default function TaskAnalytics({ meetingId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all');

  useEffect(() => {
    fetchAnalytics();
  }, [meetingId]);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`http://localhost:5001/api/analytics/meeting/${meetingId}`);
      setAnalytics(res.data);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#111827] border border-[#1f2937] rounded-3xl p-6 animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!analytics || analytics.summary.total === 0) {
    return (
      <div className="bg-[#111827] border border-[#1f2937] rounded-3xl p-6 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-bold mb-2">No Analytics Yet</h3>
        <p className="text-gray-400">Complete some tasks to see analytics!</p>
      </div>
    );
  }

  const { summary, tasksByPerson } = analytics;

  // Doughnut chart data
  const doughnutData = {
    labels: ['Pending', 'Completed', 'Overdue'],
    datasets: [
      {
        data: [summary.pending, summary.completed, summary.overdue],
        backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
        borderColor: ['#ffffff', '#ffffff', '#ffffff'],
        borderWidth: 2,
      },
    ],
  };

  // Bar chart data - Tasks by person
  const personNames = Object.keys(tasksByPerson);
  const barData = {
    labels: personNames,
    datasets: [
      {
        label: 'Pending',
        data: personNames.map(p => tasksByPerson[p].pending),
        backgroundColor: '#f59e0b',
        borderRadius: 8,
      },
      {
        label: 'Completed',
        data: personNames.map(p => tasksByPerson[p].completed),
        backgroundColor: '#10b981',
        borderRadius: 8,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#9ca3af' }
      },
    },
    scales: {
      y: {
        grid: { color: '#1f2937' },
        ticks: { color: '#9ca3af' }
      },
      x: {
        grid: { color: '#1f2937' },
        ticks: { color: '#9ca3af' }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#9ca3af' }
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{summary.total}</p>
          <p className="text-xs text-gray-400 mt-1">Total Tasks</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{summary.pending}</p>
          <p className="text-xs text-gray-400 mt-1">Pending</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{summary.completed}</p>
          <p className="text-xs text-gray-400 mt-1">Completed</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{summary.overdue}</p>
          <p className="text-xs text-gray-400 mt-1">Overdue</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-400">{summary.dueToday}</p>
          <p className="text-xs text-gray-400 mt-1">Due Today</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doughnut Chart */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-5">
          <h3 className="text-lg font-bold mb-4">Task Distribution</h3>
          <div className="h-64">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              Completion Rate: 
              <span className="text-green-400 font-bold ml-2">{summary.completionRate}%</span>
            </p>
          </div>
        </div>

        {/* Bar Chart - Tasks by Person */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-5">
          <h3 className="text-lg font-bold mb-4">Tasks by Team Member</h3>
          <div className="h-64">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}