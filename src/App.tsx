import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import { 
  Plus, 
  Minus, 
  Settings, 
  Trash2, 
  Edit2, 
  PlusCircle, 
  Menu, 
  X,
  LogOut,
  HelpCircle,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Search,
  Tag,
  Calendar,
  Image as ImageIcon,
  Layout,
  Archive,
  Star,
  Clock,
  MoreVertical,
  Filter,
  Grid,
  List,
  CheckCircle2,
  AlertCircle,
  Table as TableIcon,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List as ListIcon,
  ListOrdered
} from 'lucide-react';
import { db, auth } from './firebase';
import { format, isAfter, isBefore, startOfToday, endOfToday, addDays } from 'date-fns';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { motion, AnimatePresence } from 'motion/react';

const appId = 'notes-for-myself-app';

// Pastel Color Palette
const colors = {
  primary: '#FF5A5F', // Airbnb Red
  secondary: '#00A699', // Airbnb Teal
  accent: '#FC642D', // Airbnb Orange
  background: '#F7F7F7',
  card: '#FFFFFF',
  pastel: {
    pink: '#FFD1DC',
    blue: '#AEC6CF',
    green: '#77DD77',
    yellow: '#FDFD96',
    purple: '#B39EB5',
    orange: '#FFB347'
  }
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  tags: string[];
  dueDate: any;
  isFavorite: boolean;
  isArchived: boolean;
  imageUrl?: string;
  status: 'todo' | 'in-progress' | 'done';
  createdAt: any;
  updatedAt: any;
}

interface FolderType {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: any;
}

// Note Card Component for reuse
function NoteCard({ note, isAdmin, onEdit, onFavorite, onArchive, onDelete, onStatusChange }: { 
  note: Note, 
  isAdmin: boolean, 
  onEdit: () => void, 
  onFavorite: () => void | Promise<void>, 
  onArchive: () => void | Promise<void>, 
  onDelete: () => void | Promise<void>,
  onStatusChange: (status: 'todo' | 'in-progress' | 'done') => void | Promise<void>,
  key?: string
}) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group bg-white rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 border border-gray-100/50 flex flex-col h-full backdrop-blur-sm"
    >
      {note.imageUrl && (
        <div className="h-40 overflow-hidden relative">
          <img 
            src={note.imageUrl} 
            alt={note.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-60" />
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md ${
              note.status === 'todo' ? 'bg-blue-500/80' : 
              note.status === 'in-progress' ? 'bg-orange-500/80' : 
              'bg-green-500/80'
            }`}>
              {note.status?.replace('-', ' ') || 'todo'}
            </span>
          </div>
        </div>
      )}
      <div className="p-6 flex-1 flex flex-col">
        {!note.imageUrl && (
          <div className="mb-3">
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              note.status === 'todo' ? 'bg-blue-50 text-blue-500' : 
              note.status === 'in-progress' ? 'bg-orange-50 text-orange-500' : 
              'bg-green-50 text-green-500'
            }`}>
              {note.status?.replace('-', ' ') || 'todo'}
            </span>
          </div>
        )}
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-rose-500 transition-colors">{note.title}</h3>
          <div className="flex items-center gap-1">
            <button 
              onClick={onFavorite}
              className={`p-1.5 rounded-full transition-colors ${note.isFavorite ? 'text-yellow-400 bg-yellow-50' : 'text-gray-300 hover:bg-gray-100'}`}
            >
              <Star size={16} fill={note.isFavorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
        
        <div 
          className="text-gray-500 text-sm line-clamp-3 mb-4 flex-1 prose prose-sm max-w-none leading-relaxed"
          dangerouslySetInnerHTML={{ __html: note.content }}
        />

        <div className="flex flex-wrap gap-1.5 mb-4">
          {note.tags.map(tag => (
            <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
              #{tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
          <div className="flex items-center gap-3 text-gray-400">
            {note.dueDate && (
              <div className={`flex items-center gap-1 text-[10px] font-bold ${isBefore(note.dueDate.toDate ? note.dueDate.toDate() : new Date(note.dueDate), new Date()) ? 'text-rose-500' : ''}`}>
                <Calendar size={12} />
                {format(note.dueDate.toDate ? note.dueDate.toDate() : new Date(note.dueDate), 'MMM d')}
              </div>
            )}
            <div className="flex items-center gap-1 text-[10px] font-bold">
              <Clock size={12} />
              {note.createdAt ? format(note.createdAt.toDate(), 'MMM d') : 'Just now'}
            </div>
          </div>
          
          {isAdmin && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
              <div className="flex bg-gray-100 rounded-full p-0.5 mr-1">
                {(['todo', 'in-progress', 'done'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    className={`p-1 rounded-full transition-all ${note.status === s ? 'bg-white shadow-sm text-rose-500' : 'text-gray-400 hover:text-gray-600'}`}
                    title={`Mark as ${s}`}
                  >
                    {s === 'todo' ? <Minus size={12} /> : s === 'in-progress' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                  </button>
                ))}
              </div>
              <button 
                onClick={onEdit}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-rose-500 transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={onArchive}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-rose-500 transition-colors"
              >
                <Archive size={14} />
              </button>
              <button 
                onClick={onDelete}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      setError(e.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 p-8">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl border border-rose-100">
          <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-center mb-4">Something went wrong</h2>
          <p className="text-gray-500 text-center mb-6 text-sm">The application encountered an error. Please try refreshing the page.</p>
          <div className="bg-gray-50 p-4 rounded-xl text-xs font-mono text-rose-600 break-all mb-6">
            {error}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <AppContent />;
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'board' | 'archive' | 'favorites' | 'due' | 'workflow'>('board');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [editNoteData, setEditNoteData] = useState<Note | null>(null);
  const [editFolderData, setEditFolderData] = useState<FolderType | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Rich Text Editor State
  const [editorContent, setEditorContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteFolderId, setNoteFolderId] = useState<string | null>(null);
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [noteDueDate, setNoteDueDate] = useState<string>('');
  const [noteImageUrl, setNoteImageUrl] = useState<string>('');
  const [noteStatus, setNoteStatus] = useState<'todo' | 'in-progress' | 'done'>('todo');

  const handleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u && (u.email === 'admin@notes.com' || u.uid === 'qelYRH3ns4daioIRieNXWU2hvpA2')) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Folders
  useEffect(() => {
    if (!isAdmin) return;
    const fCol = collection(db, 'artifacts', appId, 'public', 'data', 'folders');
    const unsubscribe = onSnapshot(fCol, (snapshot) => {
      const fs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FolderType));
      setFolders(fs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, fCol.path);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  // Fetch Notes
  useEffect(() => {
    if (!isAdmin) return;
    const nCol = collection(db, 'artifacts', appId, 'public', 'data', 'notes');
    const unsubscribe = onSnapshot(nCol, (snapshot) => {
      const ns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
      setNotes(ns.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, nCol.path);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleLogin = async () => {
    try {
      setAuthError(null);
      await signInWithEmailAndPassword(auth, 'admin@notes.com', loginPassword);
      setLoginPassword('');
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError("Incorrect password or Admin user not found. Please ensure 'admin@notes.com' is created in Firebase Console.");
      } else {
        setAuthError(err.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAdmin(false);
    } catch (err: any) {
      console.error("Logout error:", err);
    }
  };

  const handleAddNote = async () => {
    if (!isAdmin) return;
    const path = `artifacts/${appId}/public/data/notes`;
    try {
      const noteData = {
        title: noteTitle || 'Untitled Note',
        content: editorContent,
        folderId: noteFolderId,
        tags: noteTags,
        dueDate: noteDueDate ? new Date(noteDueDate) : null,
        imageUrl: noteImageUrl,
        status: noteStatus,
        isFavorite: editNoteData?.isFavorite || false,
        isArchived: editNoteData?.isArchived || false,
        updatedAt: serverTimestamp()
      };

      if (editNoteData) {
        const docRef = doc(db, path, editNoteData.id);
        await updateDoc(docRef, noteData);
        setEditNoteData(null);
      } else {
        await addDoc(collection(db, path), {
          ...noteData,
          createdAt: serverTimestamp()
        });
      }
      setShowAddNoteModal(false);
      resetNoteForm();
    } catch (err) {
      handleFirestoreError(err, editNoteData ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const resetNoteForm = () => {
    setNoteTitle('');
    setEditorContent('');
    setNoteFolderId(null);
    setNoteTags([]);
    setNoteDueDate('');
    setNoteImageUrl('');
    setNoteStatus('todo');
  };

  const handleAddFolder = async (name: string, parentId: string | null) => {
    if (!isAdmin || !name.trim()) return;
    const path = `artifacts/${appId}/public/data/folders`;
    try {
      if (editFolderData) {
        const docRef = doc(db, path, editFolderData.id);
        await updateDoc(docRef, { name, parentId });
        setEditFolderData(null);
      } else {
        await addDoc(collection(db, path), {
          name,
          parentId,
          createdAt: serverTimestamp()
        });
      }
      setShowAddFolderModal(false);
    } catch (err) {
      handleFirestoreError(err, editFolderData ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const toggleFavorite = async (note: Note) => {
    if (!isAdmin) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'notes', note.id);
    await updateDoc(docRef, { isFavorite: !note.isFavorite });
  };

  const toggleArchive = async (note: Note) => {
    if (!isAdmin) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'notes', note.id);
    await updateDoc(docRef, { isArchived: !note.isArchived });
  };

  const updateNoteStatus = async (noteId: string, newStatus: 'todo' | 'in-progress' | 'done') => {
    if (!isAdmin) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'notes', noteId);
    await updateDoc(docRef, { status: newStatus, updatedAt: serverTimestamp() });
  };

  const deleteNote = async (id: string) => {
    if (!isAdmin || !confirm("Delete this note?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', id));
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFolder = currentFolderId ? note.folderId === currentFolderId : true;
      const matchesTags = selectedTags.length > 0 ? selectedTags.every(t => note.tags.includes(t)) : true;
      
      if (viewMode === 'archive') return note.isArchived && matchesSearch && matchesTags;
      if (viewMode === 'favorites') return note.isFavorite && !note.isArchived && matchesSearch && matchesTags;
      if (viewMode === 'due') {
        if (!note.dueDate) return false;
        const noteDate = note.dueDate.toDate ? note.dueDate.toDate() : new Date(note.dueDate);
        return isBefore(noteDate, addDays(new Date(), 7)) && !note.isArchived && matchesSearch && matchesTags;
      }
      
      return !note.isArchived && matchesSearch && matchesFolder && matchesTags;
    });
  }, [notes, searchQuery, currentFolderId, selectedTags, viewMode]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(n => n.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [notes]);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean'],
      ['table']
    ],
  };

  if (!isAuthReady) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full"
      />
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 text-center"
        >
          <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Folder size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Notes For Myself</h1>
          <p className="text-gray-500 mb-10 font-medium">Admin Login Required</p>
          
          {authError && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-medium mb-8 border border-rose-100">
              {authError}
            </div>
          )}
          
          <input 
            type="password" 
            value={loginPassword} 
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Enter Admin Password" 
            className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl mb-6 text-center focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all text-lg font-bold tracking-widest"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          
          <button 
            onClick={handleLogin}
            className="w-full bg-rose-500 text-white py-5 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all active:translate-y-0"
          >
            Access Notes
          </button>
          
          <p className="mt-8 text-xs text-gray-400 font-medium">
            This application is restricted to authorized personnel only.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] text-[#222222] font-sans selection:bg-rose-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors md:hidden"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setViewMode('board'); setCurrentFolderId(null); }}>
              <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white">
                <PlusCircle size={24} />
              </div>
              <h1 className="text-xl font-bold tracking-tight hidden sm:block">Notes For Myself</h1>
            </div>
          </div>

          {/* Search Bar - Airbnb Style */}
          <div className="hidden md:flex items-center bg-white border border-gray-300 rounded-full py-2 px-4 shadow-sm hover:shadow-md transition-shadow max-w-md w-full mx-4">
            <Search size={18} className="text-gray-500 mr-2" />
            <input 
              type="text" 
              placeholder="Search notes, tags, content..."
              className="bg-transparent border-none focus:outline-none w-full text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="h-6 w-px bg-gray-300 mx-2" />
            <button className="bg-rose-500 p-2 rounded-full text-white">
              <Filter size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setEditNoteData(null); resetNoteForm(); setShowAddNoteModal(true); }}
                className="bg-rose-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              >
                <Plus size={18} /> <span className="hidden sm:inline">New Note</span>
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:block w-64 p-6 sticky top-20 h-[calc(100vh-80px)] overflow-y-auto">
          <nav className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">Navigation</h3>
              <ul className="space-y-1">
                <li>
                  <button 
                    onClick={() => { setViewMode('board'); setCurrentFolderId(null); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'board' && !currentFolderId ? 'bg-rose-50 text-rose-600' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    <Grid size={18} /> All Notes
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setViewMode('workflow')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'workflow' ? 'bg-rose-50 text-rose-600' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    <Layout size={18} /> Workflow Board
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setViewMode('favorites')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'favorites' ? 'bg-rose-50 text-rose-600' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    <Star size={18} /> Favorites
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setViewMode('due')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'due' ? 'bg-rose-50 text-rose-600' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    <Clock size={18} /> Upcoming
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setViewMode('archive')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'archive' ? 'bg-rose-50 text-rose-600' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    <Archive size={18} /> Archive
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Folders</h3>
                {isAdmin && (
                  <button onClick={() => setShowAddFolderModal(true)} className="text-rose-500 hover:bg-rose-50 p-1 rounded">
                    <Plus size={14} />
                  </button>
                )}
              </div>
              <ul className="space-y-1">
                {folders.filter(f => !f.parentId).map(folder => (
                  <li key={folder.id}>
                    <button 
                      onClick={() => { setCurrentFolderId(folder.id); setViewMode('board'); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentFolderId === folder.id ? 'bg-rose-50 text-rose-600' : 'hover:bg-gray-100 text-gray-700'}`}
                    >
                      <Folder size={18} /> {folder.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">Tags</h3>
              <div className="flex flex-wrap gap-2 px-2">
                {allTags.map(tag => (
                  <button 
                    key={tag}
                    onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${selectedTags.includes(tag) ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {viewMode === 'board' ? (currentFolderId ? folders.find(f => f.id === currentFolderId)?.name : 'My Notes') : 
                 viewMode === 'archive' ? 'Archive' : 
                 viewMode === 'favorites' ? 'Favorites' : 
                 viewMode === 'workflow' ? 'Workflow Board' : 'Upcoming Due Dates'}
              </h2>
              <p className="text-gray-500 mt-1">{filteredNotes.length} notes found</p>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              {selectedTags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-xs font-bold">
                  #{tag} <X size={12} className="cursor-pointer" onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))} />
                </span>
              ))}
              {selectedTags.length > 0 && (
                <button onClick={() => setSelectedTags([])} className="text-xs text-gray-400 font-bold hover:text-gray-600">Clear all</button>
              )}
            </div>
          </div>

          {/* Notes Grid or Workflow Board */}
          {viewMode === 'workflow' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {(['todo', 'in-progress', 'done'] as const).map((status) => (
                <div key={status} className="bg-gray-100/50 rounded-3xl p-4 min-h-[600px] flex flex-col gap-4">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-gray-500 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${status === 'todo' ? 'bg-blue-400' : status === 'in-progress' ? 'bg-orange-400' : 'bg-green-400'}`} />
                      {status.replace('-', ' ')}
                    </h3>
                    <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-400 shadow-sm">
                      {filteredNotes.filter(n => n.status === status).length}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    {filteredNotes.filter(n => n.status === status).map((note) => (
                      <NoteCard 
                        key={note.id} 
                        note={note} 
                        isAdmin={isAdmin} 
                        onEdit={() => {
                          setEditNoteData(note);
                          setNoteTitle(note.title);
                          setEditorContent(note.content);
                          setNoteFolderId(note.folderId);
                          setNoteTags(note.tags);
                          setNoteDueDate(note.dueDate ? format(note.dueDate.toDate ? note.dueDate.toDate() : new Date(note.dueDate), 'yyyy-MM-dd') : '');
                          setNoteImageUrl(note.imageUrl || '');
                          setNoteStatus(note.status || 'todo');
                          setShowAddNoteModal(true);
                        }}
                        onFavorite={() => toggleFavorite(note)}
                        onArchive={() => toggleArchive(note)}
                        onDelete={() => deleteNote(note.id)}
                        onStatusChange={(s) => updateNoteStatus(note.id, s)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredNotes.map((note) => (
                  <NoteCard 
                    key={note.id} 
                    note={note} 
                    isAdmin={isAdmin} 
                    onEdit={() => {
                      setEditNoteData(note);
                      setNoteTitle(note.title);
                      setEditorContent(note.content);
                      setNoteFolderId(note.folderId);
                      setNoteTags(note.tags);
                      setNoteDueDate(note.dueDate ? format(note.dueDate.toDate ? note.dueDate.toDate() : new Date(note.dueDate), 'yyyy-MM-dd') : '');
                      setNoteImageUrl(note.imageUrl || '');
                      setNoteStatus(note.status || 'todo');
                      setShowAddNoteModal(true);
                    }}
                    onFavorite={() => toggleFavorite(note)}
                    onArchive={() => toggleArchive(note)}
                    onDelete={() => deleteNote(note.id)}
                    onStatusChange={(s) => updateNoteStatus(note.id, s)}
                  />
                ))}
              </AnimatePresence>
              {filteredNotes.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <Search size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">No notes found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
              onClick={() => setIsSidebarOpen(false)} 
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="relative bg-white w-80 h-full shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="font-bold text-xl">Menu</h2>
                <button onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {/* Same navigation as desktop sidebar */}
                <nav className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Navigation</h3>
                    <ul className="space-y-2">
                      <li>
                        <button onClick={() => { setViewMode('board'); setCurrentFolderId(null); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 font-medium text-gray-700"><Grid size={20} /> All Notes</button>
                      </li>
                      <li>
                        <button onClick={() => { setViewMode('favorites'); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 font-medium text-gray-700"><Star size={20} /> Favorites</button>
                      </li>
                      <li>
                        <button onClick={() => { setViewMode('due'); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 font-medium text-gray-700"><Clock size={20} /> Upcoming</button>
                      </li>
                      <li>
                        <button onClick={() => { setViewMode('archive'); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 font-medium text-gray-700"><Archive size={20} /> Archive</button>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Folders</h3>
                      {isAdmin && <button onClick={() => setShowAddFolderModal(true)} className="text-rose-500"><Plus size={16} /></button>}
                    </div>
                    <ul className="space-y-2">
                      {folders.map(f => (
                        <li key={f.id}>
                          <button onClick={() => { setCurrentFolderId(f.id); setViewMode('board'); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 font-medium text-gray-700"><Folder size={20} /> {f.name}</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </nav>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showAddNoteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
              onClick={() => setShowAddNoteModal(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b flex items-center justify-between bg-gray-50">
                <h2 className="text-2xl font-bold">{editNoteData ? 'Edit Note' : 'Create New Note'}</h2>
                <button onClick={() => setShowAddNoteModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Title</label>
                      <input 
                        type="text" 
                        placeholder="Enter note title..."
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all font-bold text-lg"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Folder</label>
                        <select 
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all text-sm font-medium"
                          value={noteFolderId || ''}
                          onChange={(e) => setNoteFolderId(e.target.value || null)}
                        >
                          <option value="">No Folder</option>
                          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Status</label>
                        <select 
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all text-sm font-medium"
                          value={noteStatus}
                          onChange={(e) => setNoteStatus(e.target.value as any)}
                        >
                          <option value="todo">To Do</option>
                          <option value="in-progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Due Date</label>
                      <input 
                        type="date" 
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all text-sm font-medium"
                        value={noteDueDate}
                        onChange={(e) => setNoteDueDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Image URL</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="https://images.unsplash.com/..."
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all text-sm font-medium"
                          value={noteImageUrl}
                          onChange={(e) => setNoteImageUrl(e.target.value)}
                        />
                        <button className="p-4 bg-gray-100 rounded-2xl text-gray-500 hover:bg-gray-200 transition-colors">
                          <ImageIcon size={20} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tags (comma separated)</label>
                      <input 
                        type="text" 
                        placeholder="work, personal, idea..."
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all text-sm font-medium"
                        value={noteTags.join(', ')}
                        onChange={(e) => setNoteTags(e.target.value.split(',').map(t => t.trim()).filter(t => t !== ''))}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Content</label>
                    <div className="flex-1 min-h-[300px] border border-gray-200 rounded-2xl overflow-hidden">
                      <ReactQuill 
                        theme="snow" 
                        value={editorContent} 
                        onChange={setEditorContent}
                        modules={quillModules}
                        className="h-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button 
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-6 py-3 bg-white border border-gray-300 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddNote}
                  className="px-8 py-3 bg-rose-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  {editNoteData ? 'Update Note' : 'Save Note'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showAddFolderModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
              onClick={() => setShowAddFolderModal(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold mb-6">{editFolderData ? 'Edit Folder' : 'New Folder'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Folder Name</label>
                  <input 
                    type="text" 
                    id="folderName"
                    placeholder="Enter folder name..."
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all font-bold"
                    defaultValue={editFolderData?.name}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Parent Folder (Optional)</label>
                  <select 
                    id="folderParent"
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all text-sm font-medium"
                    defaultValue={editFolderData?.parentId || ''}
                  >
                    <option value="">Root</option>
                    {folders.filter(f => f.id !== editFolderData?.id).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => {
                    const name = (document.getElementById('folderName') as HTMLInputElement).value;
                    const parentId = (document.getElementById('folderParent') as HTMLSelectElement).value || null;
                    handleAddFolder(name, parentId);
                  }}
                  className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  Save Folder
                </button>
                <button 
                  onClick={() => setShowAddFolderModal(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button - Mobile */}
      {isAdmin && (
        <button 
          onClick={() => { setEditNoteData(null); resetNoteForm(); setShowAddNoteModal(true); }}
          className="fixed bottom-8 right-8 md:hidden w-16 h-16 bg-rose-500 text-white rounded-full shadow-2xl flex items-center justify-center z-40 hover:scale-110 transition-transform active:scale-95"
        >
          <Plus size={32} />
        </button>
      )}

      {/* Custom Styles for Quill */}
      <style>{`
        .ql-container {
          font-family: inherit;
          font-size: 16px;
        }
        .ql-editor {
          min-height: 250px;
        }
        .ql-toolbar.ql-snow {
          border-top: none;
          border-left: none;
          border-right: none;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          padding: 8px 12px;
        }
        .ql-container.ql-snow {
          border: none;
        }
        .prose img {
          border-radius: 1rem;
          margin: 1rem 0;
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        .prose th, .prose td {
          border: 1px solid #e5e7eb;
          padding: 0.5rem;
          text-align: left;
        }
        .prose th {
          background: #f9fafb;
        }
      `}</style>
    </div>
  );
}
