// client/src/components/CalendarSync.jsx
import { useState } from 'react';
import axios from 'axios';

export default function CalendarSync({ taskId, taskName, dueDate }) {
  const [syncing, setSyncing] = useState(false);

  const syncToCalendar = async () => {
    setSyncing(true);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please login first');
        return;
      }
      
      console.log("Sending request with token:", token.substring(0, 20) + "...");
      
      const res = await axios.post(
        `http://localhost:5001/api/calendar/create-event/${taskId}`,
        { syncToCalendar: true },
        { 
          headers: { 
            'Authorization': token,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      console.log("Calendar response:", res.data);
      
      if (res.data.calendarUrl) {
        window.open(res.data.calendarUrl, '_blank');
        alert('Opening Google Calendar to add event!');
      } else {
        alert('Calendar event created successfully!');
      }
      
    } catch (err) {
      console.error("Calendar sync error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      
      if (err.response?.status === 401) {
        alert('Please login again. Your session may have expired.');
        // Optionally redirect to login
        // window.location.href = '/login';
      } else if (err.response?.status === 400) {
        alert('Calendar not configured. This feature is coming soon!');
      } else {
        alert('Error syncing to calendar: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={syncToCalendar}
      disabled={syncing}
      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 disabled:opacity-50"
    >
      <span>📅</span>
      {syncing ? 'Adding...' : 'Calendar'}
    </button>
  );
}