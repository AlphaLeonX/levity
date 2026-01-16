/// <reference types="chrome-types" />
import { createStore } from 'levity';

// Types
interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface AppState {
  notes: Note[];
  activeNoteId: string | null;
}

// Create the synced store
const store = createStore<AppState>({
  initial: {
    notes: [],
    activeNoteId: null,
  },
  debounce: 500,
  onConflict: (ctx) => {
    // Use the most recently updated version
    return ctx.remoteUpdatedAt > ctx.localUpdatedAt ? ctx.remote : ctx.local;
  },
  onQuotaWarning: (quota) => {
    console.warn(`[Levity Notes] Storage quota at ${quota.percent}%`);
    updateQuotaDisplay(quota.percent);
  },
});

// DOM Elements
const noteListEl = document.getElementById('note-list') as HTMLUListElement;
const editorEl = document.getElementById('editor') as HTMLElement;
const emptyStateEl = document.getElementById('empty-state') as HTMLElement;
const titleInputEl = document.getElementById('note-title') as HTMLInputElement;
const contentInputEl = document.getElementById('note-content') as HTMLTextAreaElement;
const addNoteBtn = document.getElementById('add-note') as HTMLButtonElement;
const addFirstNoteBtn = document.getElementById('add-first-note') as HTMLButtonElement;
const deleteNoteBtn = document.getElementById('delete-note') as HTMLButtonElement;
const syncStatusEl = document.getElementById('sync-status') as HTMLElement;
const quotaEl = document.getElementById('quota') as HTMLElement;

// State
let currentDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

// Initialize
async function init() {
  await store.init();

  // Initial render
  render();

  // Subscribe to changes (including from other devices)
  store.subscribeAll((state, changedKeys, source) => {
    if (source === 'remote') {
      showSyncStatus('Synced from another device');
    }
    render();
  });

  // Setup event listeners
  setupEventListeners();

  // Show initial quota
  const quota = await store.getQuota();
  updateQuotaDisplay(quota.percent);
}

function setupEventListeners() {
  // Add note buttons
  addNoteBtn.addEventListener('click', createNote);
  addFirstNoteBtn.addEventListener('click', createNote);

  // Delete note
  deleteNoteBtn.addEventListener('click', deleteCurrentNote);

  // Title input
  titleInputEl.addEventListener('input', () => {
    debouncedSave();
  });

  // Content input
  contentInputEl.addEventListener('input', () => {
    debouncedSave();
  });
}

// Debounced save
function debouncedSave() {
  if (currentDebounceTimeout) {
    clearTimeout(currentDebounceTimeout);
  }
  currentDebounceTimeout = setTimeout(() => {
    saveCurrentNote();
  }, 300);
}

// Create a new note
async function createNote() {
  const notes = store.get('notes');
  const newNote: Note = {
    id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await store.setAll({
    notes: [newNote, ...notes],
    activeNoteId: newNote.id,
  });

  // Focus on title
  setTimeout(() => {
    titleInputEl.focus();
  }, 50);
}

// Save current note
async function saveCurrentNote() {
  const activeId = store.get('activeNoteId');
  if (!activeId) return;

  const notes = store.get('notes');
  const noteIndex = notes.findIndex((n) => n.id === activeId);
  if (noteIndex === -1) return;

  const updatedNote: Note = {
    ...notes[noteIndex],
    title: titleInputEl.value,
    content: contentInputEl.value,
    updatedAt: Date.now(),
  };

  const updatedNotes = [...notes];
  updatedNotes[noteIndex] = updatedNote;

  await store.set('notes', updatedNotes);
}

// Delete current note
async function deleteCurrentNote() {
  const activeId = store.get('activeNoteId');
  if (!activeId) return;

  if (!confirm('Delete this note?')) return;

  const notes = store.get('notes');
  const updatedNotes = notes.filter((n) => n.id !== activeId);
  const newActiveId = updatedNotes[0]?.id ?? null;

  await store.setAll({
    notes: updatedNotes,
    activeNoteId: newActiveId,
  });
}

// Select a note
async function selectNote(noteId: string) {
  // Save current note before switching
  await saveCurrentNote();
  await store.set('activeNoteId', noteId);
}

// Render the UI
function render() {
  const notes = store.get('notes');
  const activeNoteId = store.get('activeNoteId');

  // Render note list
  renderNoteList(notes, activeNoteId);

  // Show/hide editor vs empty state
  if (notes.length === 0) {
    editorEl.classList.add('hidden');
    emptyStateEl.classList.add('visible');
  } else {
    editorEl.classList.remove('hidden');
    emptyStateEl.classList.remove('visible');

    // Load active note into editor
    const activeNote = notes.find((n) => n.id === activeNoteId);
    if (activeNote) {
      // Only update if different (to preserve cursor position)
      if (titleInputEl.value !== activeNote.title) {
        titleInputEl.value = activeNote.title;
      }
      if (contentInputEl.value !== activeNote.content) {
        contentInputEl.value = activeNote.content;
      }
    } else if (notes.length > 0) {
      // No active note but notes exist, select first one
      store.set('activeNoteId', notes[0].id);
    }
  }
}

// Render note list
function renderNoteList(notes: Note[], activeNoteId: string | null) {
  noteListEl.innerHTML = '';

  for (const note of notes) {
    const li = document.createElement('li');
    li.className = `note-item${note.id === activeNoteId ? ' active' : ''}`;
    li.innerHTML = `
      <div class="note-item-title">${escapeHtml(note.title) || 'Untitled'}</div>
      <div class="note-item-preview">${escapeHtml(note.content.slice(0, 50)) || 'No content'}</div>
    `;
    li.addEventListener('click', () => selectNote(note.id));
    noteListEl.appendChild(li);
  }
}

// Show sync status
function showSyncStatus(message: string) {
  syncStatusEl.textContent = message;
  syncStatusEl.classList.add('visible', 'synced');

  setTimeout(() => {
    syncStatusEl.classList.remove('visible', 'synced');
  }, 2000);
}

// Update quota display
function updateQuotaDisplay(percent: number) {
  quotaEl.textContent = `Storage: ${percent.toFixed(1)}%`;
}

// Escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start the app
init().catch(console.error);
