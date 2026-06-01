import { useState } from 'react';
import axios from 'axios';

export default function MeetingSearch({ meetingId, onJumpToMessage }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      alert("Please enter a search term");
      return;
    }
    
    setIsSearching(true);
    
    try {
      const res = await axios.get(
        `http://localhost:5001/api/search/meeting/${meetingId}?q=${encodeURIComponent(searchTerm)}`
      );
      
      setSearchResults(res.data.results);
      setShowResults(true);
      
      if (res.data.count === 0) {
        alert(`No results found for "${searchTerm}"`);
      }
      
    } catch (err) {
      console.error("Search error:", err);
      alert("Error searching transcript");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className="mb-6">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="🔍 Search transcript... (e.g., 'budget', 'deadline', 'John')"
            className="w-full bg-[#0b1220] border border-[#1d2942] rounded-2xl p-4 pl-12 outline-none focus:border-blue-500 text-white"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
            🔍
          </span>
        </div>
        
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="bg-blue-500 hover:bg-blue-600 px-6 rounded-2xl font-semibold transition disabled:opacity-50"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
        
        {showResults && (
          <button
            onClick={clearSearch}
            className="bg-gray-600 hover:bg-gray-700 px-6 rounded-2xl font-semibold transition"
          >
            Clear
          </button>
        )}
      </div>
      
      {/* Search Results */}
      {showResults && searchResults.length > 0 && (
        <div className="mt-4 bg-[#111827] border border-[#1f2937] rounded-2xl overflow-hidden">
          <div className="bg-blue-500/10 px-5 py-3 border-b border-[#1f2937]">
            <h3 className="font-semibold text-blue-400">
              📋 Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchTerm}"
            </h3>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {searchResults.map((result, idx) => (
              <div 
                key={idx}
                className="p-4 border-b border-[#1f2937] hover:bg-[#0b1220] transition cursor-pointer"
                onClick={() => onJumpToMessage && onJumpToMessage(idx)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-400 font-semibold text-sm">
                    👤 {result.sender}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {result.time ? new Date(result.time).toLocaleTimeString() : 'Unknown time'}
                  </span>
                </div>
                <div 
                  className="text-gray-200 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: result.highlightedText }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}