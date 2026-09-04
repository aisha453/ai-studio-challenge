import { useState, useRef, useEffect } from 'react';
import { JournalEntry, ReflectionMode, ChatMessage } from '../types';
import Markdown from 'react-markdown';
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  CheckCircle2,
  Clock,
  Star,
  Compass,
  FileText,
  Lightbulb,
  ListTodo,
  Copy,
  Check,
} from 'lucide-react';

interface JournalEditorProps {
  entry: JournalEntry;
  onUpdateEntry: (updated: JournalEntry) => Promise<void>;
  isSaving: boolean;
  onSendPrompt: (prompt: string, mode: ReflectionMode) => Promise<void>;
  isGenerating: boolean;
  saveError: string | null;
  onRetrySave?: () => void;
}

const MODES: { id: ReflectionMode; label: string; icon: any; description: string }[] = [
  {
    id: 'reflect',
    label: 'Deep Reflection',
    icon: Compass,
    description: 'Empathetic inquiry, psychological patterns, and thoughtful questions',
  },
  {
    id: 'summarize',
    label: 'Summary & Themes',
    icon: FileText,
    description: 'Concise executive summary, core emotional arc, and key takeaways',
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm Ideas',
    icon: Lightbulb,
    description: 'Alternative angles, constructive possibilities, and creative reframing',
  },
  {
    id: 'action_items',
    label: 'Action Items',
    icon: ListTodo,
    description: 'Bite-sized next steps, gentle habit changes, and practical resolutions',
  },
];

const STARTER_PROMPTS = [
  'Reflecting on what drained and energized me today...',
  'Working through an important decision I need to make...',
  'Unpacking a difficult interaction or feeling...',
  'Celebrating a small personal win that meant a lot to me...',
];

export function JournalEditor({
  entry,
  onUpdateEntry,
  isSaving,
  onSendPrompt,
  isGenerating,
  saveError,
  onRetrySave,
}: JournalEditorProps) {
  const [inputText, setInputText] = useState('');
  const [selectedMode, setSelectedMode] = useState<ReflectionMode>('reflect');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(entry.title || '');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync title input with entry prop
  useEffect(() => {
    setTitleValue(entry.title || '');
  }, [entry.id, entry.title]);

  // Scroll to bottom of conversation when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.messages, isGenerating]);

  const handleTitleSubmit = async () => {
    setIsEditingTitle(false);
    const trimmed = titleValue.trim() || 'Untitled Reflection';
    if (trimmed !== entry.title) {
      await onUpdateEntry({
        ...entry,
        title: trimmed,
      });
    }
  };

  const handleToggleStar = async () => {
    await onUpdateEntry({
      ...entry,
      starred: !entry.starred,
    });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || isGenerating) return;

    // Call the parent handler
    await onSendPrompt(cleanText, selectedMode);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white/25 backdrop-blur-md overflow-hidden">
      {/* Top entry metadata bar */}
      <div className="px-4 sm:px-6 py-3.5 bg-white/50 backdrop-blur-lg border-b border-white/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          {isEditingTitle ? (
            <input
              id="entry-title-input"
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="font-semibold text-base sm:text-lg text-slate-900 bg-white/80 backdrop-blur-md px-2.5 py-0.5 rounded-xl border border-white/80 focus:outline-none focus:ring-1 focus:ring-slate-400 w-full max-w-md shadow-2xs"
            />
          ) : (
            <h1
              id="entry-title-heading"
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit entry title"
              className="font-semibold text-base sm:text-lg text-slate-900 cursor-pointer hover:text-slate-600 transition-colors truncate max-w-md"
            >
              {entry.title || 'Untitled Reflection'}
            </h1>
          )}

          <button
            id="star-entry-btn"
            onClick={handleToggleStar}
            title={entry.starred ? 'Starred' : 'Add to starred reflections'}
            className="p-1 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-white/50 transition-colors cursor-pointer"
          >
            <Star
              className={`w-4 h-4 ${entry.starred ? 'fill-amber-400 text-amber-500' : ''}`}
            />
          </button>
        </div>

        {/* Persistence status */}
        <div className="flex items-center gap-3 text-xs">
          {saveError ? (
            <div className="flex items-center gap-2 text-rose-700 font-medium">
              <span>Save failed</span>
              {onRetrySave && (
                <button
                  id="retry-save-btn"
                  onClick={onRetrySave}
                  className="px-2 py-0.5 rounded-lg bg-rose-100/80 border border-rose-200/70 hover:bg-rose-200/90 text-rose-800 transition-colors shadow-2xs cursor-pointer"
                >
                  Retry
                </button>
              )}
            </div>
          ) : isSaving ? (
            <span className="flex items-center gap-1.5 text-amber-700 font-medium">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Saving to Firestore...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved in isolated Firestore</span>
            </span>
          )}
        </div>
      </div>

      {/* Mode selection tabs */}
      <div className="px-4 sm:px-6 py-2 bg-white/40 backdrop-blur-md border-b border-white/50 overflow-x-auto flex items-center gap-2">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider shrink-0 mr-1">
          Gemini Lens:
        </span>
        {MODES.map((m) => {
          const Icon = m.icon;
          const isSelected = selectedMode === m.id;
          return (
            <button
              key={m.id}
              id={`mode-btn-${m.id}`}
              onClick={() => setSelectedMode(m.id)}
              title={m.description}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer backdrop-blur-md ${
                isSelected
                  ? 'bg-slate-900/90 text-white shadow-xs border border-white/20'
                  : 'bg-white/60 text-slate-700 hover:bg-white/90 border border-white/70 shadow-2xs'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-sky-300' : 'text-slate-500'}`} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conversation Thread / Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {entry.messages.length === 0 ? (
          <div className="max-w-2xl mx-auto py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/70 border border-white/80 text-slate-700 flex items-center justify-center mx-auto mb-4 shadow-sm backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Begin your reflection
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Write whatever is on your mind. You can recount an event, describe a feeling, explore a dilemma, or brainstorm plans.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  id={`starter-prompt-${idx}`}
                  onClick={() => setInputText(prompt)}
                  className="px-3.5 py-2 rounded-xl bg-white/60 border border-white/70 hover:border-slate-400 hover:bg-white/90 text-slate-700 text-xs text-left transition-all backdrop-blur-md shadow-2xs cursor-pointer"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          entry.messages.map((message: ChatMessage) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                id={`message-bubble-${message.id}`}
                className={`flex gap-3 max-w-3xl ${
                  isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-slate-900/95 text-sky-300 flex items-center justify-center shrink-0 mt-1 shadow-2xs border border-white/20">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`relative group rounded-2xl p-4 sm:p-5 text-sm leading-relaxed transition-shadow backdrop-blur-xl ${
                    isUser
                      ? 'bg-slate-900/90 text-slate-100 max-w-[85%] sm:max-w-[75%] shadow-sm border border-white/10'
                      : 'bg-white/75 border border-white/80 text-slate-800 max-w-[90%] sm:max-w-[85%] shadow-[0_4px_24px_0_rgba(15,23,42,0.04)]'
                  }`}
                >
                  {/* Role and mode badge */}
                  <div className="flex items-center justify-between gap-4 mb-2 pb-1 border-b border-white/10 text-[11px]">
                    <span className={`font-medium ${isUser ? 'text-slate-300' : 'text-slate-500'}`}>
                      {isUser ? 'My Thoughts' : 'Gemini Reflection'}
                    </span>

                    <div className="flex items-center gap-2">
                      {message.mode && (
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium capitalize ${
                          isUser ? 'bg-slate-800 text-slate-300 border border-white/10' : 'bg-white/60 text-slate-700 border border-white/70'
                        }`}>
                          {message.mode.replace('_', ' ')}
                        </span>
                      )}
                      <button
                        onClick={() => handleCopyText(message.id, message.content)}
                        className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                          isUser ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-white/80 text-slate-500'
                        }`}
                        title="Copy text"
                        aria-label="Copy message text"
                      >
                        {copiedId === message.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="prose prose-slate prose-sm max-w-none text-slate-800 leading-relaxed [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:mb-2 [&>ol]:list-decimal [&>ol]:pl-4 [&>h3]:font-semibold [&>h3]:text-slate-900 [&>h3]:mt-3 [&>h3]:mb-1">
                      <Markdown>{message.content}</Markdown>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="mt-2 text-right">
                    <span className={`text-[10px] ${isUser ? 'text-slate-400' : 'text-slate-400'}`}>
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-xl bg-white/70 border border-white/80 text-slate-700 flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Gemini Generating Pulse */}
        {isGenerating && (
          <div className="flex gap-3 max-w-3xl mr-auto justify-start animate-fadeIn">
            <div className="w-7 h-7 rounded-xl bg-slate-900/95 text-sky-300 flex items-center justify-center shrink-0 mt-1 shadow-2xs border border-white/20">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-white/75 backdrop-blur-xl border border-white/80 text-slate-700 text-xs flex items-center gap-3 shadow-2xs">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Reflecting with Gemini 3.6 Flash...</span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* User Input Workspace */}
      <div className="p-3 sm:p-4 bg-white/50 backdrop-blur-xl border-t border-white/60">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto space-y-2">
          <div className="relative rounded-2xl border border-white/80 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/50 bg-white/60 backdrop-blur-md p-2 sm:p-3 transition-all shadow-2xs">
            <textarea
              id="reflection-textarea"
              ref={textareaRef}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={`Write your thoughts or ask Gemini for ${MODES.find((m) => m.id === selectedMode)?.label.toLowerCase()}... (Press Enter to submit, Shift+Enter for new line)`}
              rows={2}
              className="w-full bg-transparent resize-none text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none max-h-48 leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2 border-t border-white/60 text-xs">
              <span className="text-[11px] text-slate-400">
                {inputText.length} / 10,000 characters
              </span>

              <button
                id="submit-reflection-btn"
                type="submit"
                disabled={!inputText.trim() || isGenerating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-xs sm:text-sm disabled:opacity-40 transition-all shadow-xs backdrop-blur-md border border-white/20 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Send to Gemini</span>
                <Send className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
