import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function GlobalSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      alert("Please enter a search term");
      return;
    }
    
    setIsSearching(true);
    
    try {
      const res = await axios.get(
        `http://localhost:5001/api/search/all?q=${encodeURIComponent(searchTerm)}`
      );
      
      setSearchResults(res.data.results);
      setShowResults(true);
      
      if (res.data.count === 0) {
        alert(`No results found for "${searchTerm}" across all meetings`);
      }
      
    } catch (err) {
      console.error("Global search error:", err);
      alert("Error searching meetings");
    } finally {
      setIsSearching(false);
    }
  };

  const handleMeetingClick = (meetingId) => {
    navigate(`/meeting/${meetingId}`);
    setShowResults(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search all meetings..."
          className="flex-1 bg-[#0b1220] border border-[#1d2942] rounded-xl p-2 text-sm outline-none focus:border-blue-500 text-white"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="bg-purple-500 hover:bg-purple-600 px-3 rounded-xl text-sm font-semibold transition"
        >
          {isSearching ? "..." : "Go"}
        </button>
      </div>
      
      {/* Search Results Dropdown */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-[#111827] border border-[#1f2937] rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
          <div className="sticky top-0 bg-[#111827] px-3 py-2 border-b border-[#1f2937]">
            <div className="flex justify-between items-center">
              <span className="text-xs text-blue-400">
                Found in {searchResults.length} meeting(s)
              </span>
              <button 
                onClick={() => setShowResults(false)}
                className="text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
          </div>
          
          {searchResults.map((result, idx) => (
            <div
              key={idx}
              onClick={() => handleMeetingClick(result.meetingId)}
              className="p-3 border-b border-[#1f2937] hover:bg-[#0b1220] cursor-pointer transition"
            >
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h4 className="font-semibold text-sm text-white">
                            📄 {result.meetingTitle}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {new Date(result.meetingDate).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                  {result.matches.length}
                </span>
              </div>
              
              <div className="space-y-1 mt-2">
                {result.matches.slice(0, 1).map((match, mIdx) => (
                  <p key={mIdx} className="text-xs text-gray-400 truncate">
                    <span className="text-blue-400">{match.sender}:</span> {match.text.substring(0, 60)}...
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}