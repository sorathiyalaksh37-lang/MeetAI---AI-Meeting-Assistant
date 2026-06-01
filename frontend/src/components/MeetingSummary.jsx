import { useState, useEffect } from 'react';

export default function MeetingSummary({ meetingId, initialSummary }) {
  const [summary, setSummary] = useState(initialSummary || {
    summary: "",
    decisions: [],
    risks: []
  });

  useEffect(() => {
    if (initialSummary) {
      setSummary(initialSummary);
    }
  }, [initialSummary]);

  // Don't show if no data
  if (!summary?.summary && (!summary?.decisions || summary.decisions.length === 0) && (!summary?.risks || summary.risks.length === 0)) {
    return (
      <div className="bg-[#111827] border border-[#1f2937] rounded-3xl p-6 mb-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <p className="text-gray-400">AI is listening for decisions, risks, and action items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Summary Card */}
      {summary?.summary && (
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-5 hover:scale-[1.02] transition-transform duration-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📝</span>
            <h3 className="text-lg font-bold text-white">AI Summary</h3>
          </div>
          <p className="text-gray-200 text-sm leading-relaxed">{summary.summary}</p>
        </div>
      )}
      
      {/* Decisions Card */}
      {summary?.decisions && summary.decisions.length > 0 && (
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-5 hover:scale-[1.02] transition-transform duration-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">✅</span>
            <h3 className="text-lg font-bold text-white">Decisions Made</h3>
          </div>
          <ul className="space-y-2">
            {summary.decisions.map((d, i) => (
              <li key={i} className="text-gray-200 text-sm flex items-start gap-2">
                <span className="text-green-400">•</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Risks Card */}
      {summary?.risks && summary.risks.length > 0 && (
        <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-2xl p-5 hover:scale-[1.02] transition-transform duration-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-lg font-bold text-white">Identified Risks</h3>
          </div>
          <ul className="space-y-2">
            {summary.risks.map((r, i) => (
              <li key={i} className="text-gray-200 text-sm flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}