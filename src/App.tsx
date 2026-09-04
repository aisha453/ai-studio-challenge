import { useState, useEffect, useCallback, useRef } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { JournalEntry, UserProfile, ReflectionMode, ChatMessage } from './types';
import {
  subscribeToUserEntries,
  saveJournalEntry,
  deleteJournalEntry,
} from './services/firestoreService';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { HistorySidebar } from './components/HistorySidebar';
import { JournalEditor } from './components/JournalEditor';
import { ErrorBanner } from './components/ErrorBanner';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'entry_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

function createBlankEntry(userId: string): JournalEntry {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    userId,
    title: 'Untitled Reflection',
    messages: [],
    createdAt: now,
    updatedAt: now,
    starred: false,
  };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Firestore Journal Entries
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);

  // Status and Error states
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const lastFailedPayloadRef = useRef<{ entry: JournalEntry } | null>(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
      } else {
        setCurrentUser(null);
        setEntries([]);
        setCurrentEntry(null);
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firestore real-time updates for authenticated user
  useEffect(() => {
    if (!currentUser?.uid) return;

    setIsLoadingEntries(true);
    const unsubscribe = subscribeToUserEntries(
      currentUser.uid,
      (updatedEntries) => {
        setEntries(updatedEntries);
        setIsLoadingEntries(false);

        // If no active entry is selected, select the most recent or create a fresh one
        setCurrentEntry((prev) => {
          if (prev) {
            const match = updatedEntries.find((e) => e.id === prev.id);
            return match || prev;
          }
          if (updatedEntries.length > 0) {
            return updatedEntries[0];
          }
          return createBlankEntry(currentUser.uid);
        });
      },
      (error) => {
        setIsLoadingEntries(false);
        setAppError('Failed to synchronize with your Firestore database: ' + error.message);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Handle Google Sign-In
  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setAuthError(err?.message || 'Failed to sign in with Google. Please try again.');
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // Create a new blank reflection entry
  const handleNewEntry = () => {
    if (!currentUser?.uid) return;
    const blank = createBlankEntry(currentUser.uid);
    setCurrentEntry(blank);
    // On small screens, close history drawer to reveal the editor
    if (window.innerWidth < 768) {
      setIsHistoryOpen(false);
    }
  };

  // Select an existing entry from history
  const handleSelectEntry = (entry: JournalEntry) => {
    setCurrentEntry(entry);
    if (window.innerWidth < 768) {
      setIsHistoryOpen(false);
    }
  };

  // Delete an entry from Firestore
  const handleDeleteEntry = async (entryId: string) => {
    if (!currentUser?.uid) return;
    try {
      await deleteJournalEntry(currentUser.uid, entryId);
      if (currentEntry?.id === entryId) {
        const remaining = entries.filter((e) => e.id !== entryId);
        if (remaining.length > 0) {
          setCurrentEntry(remaining[0]);
        } else {
          setCurrentEntry(createBlankEntry(currentUser.uid));
        }
      }
    } catch (err: any) {
      setAppError('Could not delete entry: ' + (err?.message || 'Unknown error'));
    }
  };

  // Update entry directly (e.g. rename title or star)
  const handleUpdateEntry = async (updated: JournalEntry) => {
    if (!currentUser?.uid) return;
    setCurrentEntry(updated);
    try {
      setIsSaving(true);
      setAppError(null);
      await saveJournalEntry(currentUser.uid, updated);
      lastFailedPayloadRef.current = null;
    } catch (err: any) {
      console.error('Save entry failed:', err);
      lastFailedPayloadRef.current = { entry: updated };
      setAppError('Failed to save reflection changes to Firestore. Click retry.');
    } finally {
      setIsSaving(false);
    }
  };

  // Send prompt turn to Gemini with guaranteed transaction persistence
  const handleSendPrompt = async (promptText: string, mode: ReflectionMode) => {
    if (!currentUser?.uid || !currentEntry) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
      mode,
    };

    // Step 1: Append user message to active entry
    const entryWithUserMsg: JournalEntry = {
      ...currentEntry,
      updatedAt: new Date().toISOString(),
      messages: [...currentEntry.messages, userMessage],
    };

    setCurrentEntry(entryWithUserMsg);

    // Persist immediately so user input is never lost
    try {
      setIsSaving(true);
      await saveJournalEntry(currentUser.uid, entryWithUserMsg);
    } catch (err: any) {
      console.error('Failed to save initial user message:', err);
      setAppError('Warning: Could not save message to Firestore. Checking connection...');
    } finally {
      setIsSaving(false);
    }

    // Step 2: Request reflection from backend Gemini API
    setIsGenerating(true);
    setAppError(null);

    try {
      const historyPayload = currentEntry.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptText,
          mode,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const geminiResponseText = data.response || 'I was unable to formulate a reflection.';

      const modelMessage: ChatMessage = {
        id: generateId(),
        role: 'model',
        content: geminiResponseText,
        timestamp: new Date().toISOString(),
        mode,
      };

      // Step 3: Append model response & optional auto-title
      const finalEntry: JournalEntry = {
        ...entryWithUserMsg,
        title:
          entryWithUserMsg.title === 'Untitled Reflection' && data.suggestedTitle
            ? data.suggestedTitle
            : entryWithUserMsg.title,
        summary:
          mode === 'summarize'
            ? geminiResponseText.slice(0, 150) + '...'
            : entryWithUserMsg.summary || geminiResponseText.slice(0, 150) + '...',
        updatedAt: new Date().toISOString(),
        messages: [...entryWithUserMsg.messages, modelMessage],
      };

      setCurrentEntry(finalEntry);

      // Persist completed interaction turn to Firestore
      setIsSaving(true);
      await saveJournalEntry(currentUser.uid, finalEntry);
      lastFailedPayloadRef.current = null;
    } catch (err: any) {
      console.error('Gemini Reflection API error:', err);
      lastFailedPayloadRef.current = { entry: entryWithUserMsg };
      setAppError(
        'Gemini reflection could not be generated: ' +
          (err?.message || 'Please check your connection and try again.')
      );
    } finally {
      setIsGenerating(false);
      setIsSaving(false);
    }
  };

  // Retry failed Firestore save
  const handleRetrySave = async () => {
    if (!currentUser?.uid || !lastFailedPayloadRef.current) return;
    try {
      setIsSaving(true);
      setAppError(null);
      await saveJournalEntry(currentUser.uid, lastFailedPayloadRef.current.entry);
      lastFailedPayloadRef.current = null;
    } catch (err: any) {
      setAppError('Retry failed: ' + (err?.message || 'Firestore write error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Auth checking loading indicator
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-lg">
          <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-600 font-medium">
            Verifying authentication status...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-900 selection:bg-slate-200 relative overflow-x-hidden font-sans">
      {/* Frosted ambient background illumination layers */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-200/50 rounded-full blur-3xl opacity-70" />
        <div className="absolute top-1/4 -right-20 w-80 h-80 bg-indigo-200/40 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-amber-100/50 rounded-full blur-3xl opacity-70" />
      </div>

      {/* Top Navigation */}
      <Navbar
        user={currentUser}
        onSignOut={handleSignOut}
        onNewEntry={handleNewEntry}
        onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
        isHistoryOpen={isHistoryOpen}
        isSaving={isSaving}
      />

      {/* Main Workspace Area */}
      {!currentUser ? (
        <main className="flex-1 flex flex-col">
          <LandingView
            onSignIn={handleSignIn}
            isLoading={isAuthChecking}
            authError={authError}
          />
        </main>
      ) : (
        <main className="flex-1 flex flex-col overflow-hidden max-w-7xl w-full mx-auto sm:px-4 sm:py-4">
          {/* Global error banner */}
          {appError && (
            <div className="px-4 pb-3">
              <ErrorBanner
                message={appError}
                onRetry={lastFailedPayloadRef.current ? handleRetrySave : undefined}
                onDismiss={() => setAppError(null)}
              />
            </div>
          )}

          {/* Dual pane container */}
          <div className="flex-1 flex bg-white/70 backdrop-blur-2xl sm:rounded-2xl border border-white/80 shadow-[0_8px_32px_0_rgba(15,23,42,0.06)] overflow-hidden min-h-[calc(100vh-8rem)]">
            {/* History Drawer / Column */}
            {isHistoryOpen && (
              <div className="w-full md:w-80 lg:w-96 shrink-0 h-full">
                <HistorySidebar
                  entries={entries}
                  currentEntryId={currentEntry?.id || null}
                  onSelectEntry={handleSelectEntry}
                  onDeleteEntry={handleDeleteEntry}
                  onNewEntry={handleNewEntry}
                  onClose={() => setIsHistoryOpen(false)}
                  isLoading={isLoadingEntries}
                />
              </div>
            )}

            {/* Active Reflection & Journaling Editor */}
            {currentEntry ? (
              <JournalEditor
                entry={currentEntry}
                onUpdateEntry={handleUpdateEntry}
                isSaving={isSaving}
                onSendPrompt={handleSendPrompt}
                isGenerating={isGenerating}
                saveError={appError && lastFailedPayloadRef.current ? appError : null}
                onRetrySave={handleRetrySave}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-xs">
                No active entry selected. Click "New Entry" to begin.
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
