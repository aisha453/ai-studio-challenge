import { useState, useMemo } from 'react';
import { JournalEntry } from '../types';
import { Search, Trash2, Calendar, MessageSquare, X, Plus, Sparkles, Star } from 'lucide-react';

interface HistorySidebarProps {
  entries: JournalEntry[];
  currentEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onNewEntry: () => void;
  onClose: () => void;
  isLoading: boolean;
}

export function HistorySidebar({
  entries,
  currentEntryId,
  onSelectEntry,
  onDeleteEntry,
  onNewEntry,
  onClose,
  isLoading,
}: HistorySidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  const filteredEntries = useMemo(() => {
    let list = entries;
    if (showStarredOnly) {
      list = list.filter((e) => e.starred);
    }
    if (!searchTerm.trim()) return list;

    const term = searchTerm.toLowerCase();
    return list.filter(
      (e) =>
        e.title.toLowerCase().includes(term) ||
        (e.summary && e.summary.toLowerCase().includes(term)) ||
        e.messages.some((m) => m.content.toLowerCase().includes(term))
    );
  }, [entries, searchTerm, showStarredOnly]);

  const handleDelete = async (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to permanently delete this journal entry from your Firestore?')) {
      try {
        setDeletingId(entryId);
        await onDeleteEntry(entryId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <aside className="w-full h-full flex flex-col bg-white/40 backdrop-blur-xl border-r border-white/60">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-white/50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <span>Journal History</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 border border-white/70 text-slate-700 font-normal shadow-2xs">
              {entries.length}
            </span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Isolated user Firestore records</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="sidebar-new-entry-btn"
            onClick={onNewEntry}
            title="Create new entry"
            className="p-1.5 rounded-xl bg-white/60 hover:bg-white/90 border border-white/70 text-slate-800 transition-colors shadow-2xs cursor-pointer"
            aria-label="New Entry"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            id="close-sidebar-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/70 text-slate-500 hover:text-slate-800 md:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="p-3 border-b border-white/40 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="search-entries-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search past reflections..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white/50 border border-white/70 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white/80 text-slate-800 placeholder:text-slate-400 backdrop-blur-md shadow-2xs"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span>{filteredEntries.length} reflection{filteredEntries.length === 1 ? '' : 's'}</span>
          <button
            onClick={() => setShowStarredOnly(!showStarredOnly)}
            className={`flex items-center gap-1 font-medium transition-colors cursor-pointer ${
              showStarredOnly ? 'text-amber-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Star className={`w-3 h-3 ${showStarredOnly ? 'fill-amber-500' : ''}`} />
            <span>Favorites</span>
          </button>
        </div>
      </div>

      {/* Entry List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/40">
        {isLoading && entries.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading your entries from Firestore...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-10 h-10 rounded-2xl bg-white/60 border border-white/70 text-slate-400 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
              <Sparkles className="w-5 h-5 text-amber-500/70" />
            </div>
            <p className="text-xs font-medium text-slate-700">
              {searchTerm ? 'No matching reflections' : 'No reflections yet'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[180px] mx-auto">
              {searchTerm
                ? 'Try a different keyword or clear your search'
                : 'Write your first thoughts to start your reflective dialogue with Gemini'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = entry.id === currentEntryId;
            const firstUserMessage = entry.messages.find((m) => m.role === 'user');
            const previewSnippet =
              entry.summary || firstUserMessage?.content || 'Empty reflection thread';

            return (
              <div
                key={entry.id}
                id={`entry-item-${entry.id}`}
                onClick={() => onSelectEntry(entry)}
                className={`group relative p-3.5 text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white/80 backdrop-blur-md border-l-3 border-slate-900 shadow-2xs'
                    : 'hover:bg-white/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-semibold text-slate-900 line-clamp-1 group-hover:text-slate-950 transition-colors">
                    {entry.title || 'Untitled Reflection'}
                  </h3>

                  <button
                    id={`delete-entry-btn-${entry.id}`}
                    onClick={(e) => handleDelete(e, entry.id)}
                    disabled={deletingId === entry.id}
                    title="Delete entry"
                    aria-label={`Delete ${entry.title}`}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 rounded transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                  {previewSnippet}
                </p>

                <div className="mt-2.5 flex items-center gap-3 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(entry.updatedAt || entry.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {entry.messages.length} turn{entry.messages.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
