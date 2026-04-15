import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc, 
  setDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  writeBatch,
  limit,
  getDocs
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import { 
  Maximize2,
  Minimize2,
  ExternalLink,
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
  Sparkles,
  Copy,
  MoreVertical,
  MoreHorizontal,
  Filter,
  Grid,
  List,
  CheckCircle2,
  CheckSquare,
  Pin,
  Bell,
  AlertCircle,
  Undo2,
  Redo2,
  FolderInput,
  Table as TableIcon,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List as ListIcon,
  ListOrdered,
  Palette,
  ChevronLeft,
  LayoutGrid,
  Link as LinkIcon,
  Share2,
  History
} from 'lucide-react';
import { db, auth } from './firebase';
import { format, isAfter, isBefore, startOfToday, endOfToday, addDays } from 'date-fns';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { motion, AnimatePresence } from 'motion/react';

const appId = 'notes-for-myself-app';

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

// Pastel Color Palette
const colors = {
  primary: '#9D85FF', // Soft Purple
  secondary: '#D8B4FE', // Lavender
  accent: '#F3E8FF', // Very Light Purple
  background: '#F9F7FF',
  card: '#FFFFFF',
  pastel: {
    pink: '#FCE7F3',
    blue: '#E0F2FE',
    green: '#DCFCE7',
    yellow: '#FEF9C3',
    purple: '#F3E8FF',
    orange: '#FFEDD5'
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
  isPinned: boolean;
  size: 'sm' | 'md' | 'lg';
  imageUrl?: string;
  status: string;
  color?: string;
  createdAt: any;
  updatedAt: any;
  uid: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  isCollapsed?: boolean;
  canvasX?: number;
  canvasY?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  links?: string[];
}

interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  content: string;
  createdAt: any;
  uid: string;
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
  uid: string;
}

interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  isPinned: boolean;
  isArchived?: boolean;
  listId: string;
  noteId?: string;
  dueDate?: any;
  createdAt: any;
  uid: string;
}

interface TaskList {
  id: string;
  name: string;
  isFavorite: boolean;
  createdAt: any;
  uid: string;
}

interface StatusOption {
  id: string;
  label: string;
  color: string;
  isVisible: boolean;
  background?: string;
}

const PASTEL_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Pink', value: 'rgba(255, 209, 220, 0.4)' },
  { name: 'Blue', value: 'rgba(174, 198, 207, 0.4)' },
  { name: 'Green', value: 'rgba(119, 221, 119, 0.4)' },
  { name: 'Yellow', value: 'rgba(253, 253, 150, 0.4)' },
  { name: 'Purple', value: 'rgba(179, 158, 181, 0.4)' },
  { name: 'Orange', value: 'rgba(255, 179, 71, 0.4)' },
  { name: 'Mint', value: 'rgba(152, 255, 152, 0.4)' },
  { name: 'Lavender', value: 'rgba(230, 230, 250, 0.4)' }
];

interface UserSettings {
  defaultFont: string;
  defaultSize: string;
  defaultAlignment: 'left' | 'center' | 'right' | 'justify';
  cardViewMode: 'compact' | 'full';
  defaultFolderId: string | null;
  defaultTaskListId: string | null;
  startupFolderId: string | null;
  startupTaskListId: string | null;
  enableNotifications: boolean;
  isSidebarCollapsed: boolean;
  gridColumns: number;
  notesPerColumn: number;
  sortBy: 'date' | 'status';
  theme: 'light' | 'dark' | 'glass' | 'minimal';
  boardTheme: string;
}

interface ActiveWindow {
  id: string;
  noteId: string;
  type: 'view' | 'edit';
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

interface FolderType {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: any;
  background?: string;
  wallpaper?: string;
}

// Note Card Component for reuse
const NoteCard = React.memo(({ note, isAdmin, onEdit, onFavorite, onArchive, onDelete, onStatusChange, onColorChange, onPin, onSizeChange, onToggleCollapse, onPopout, statuses, viewMode, onClick, userSettings, onContextMenu }: { 
  note: Note, 
  isAdmin: boolean, 
  onEdit: () => void, 
  onFavorite: () => void | Promise<void>, 
  onArchive: () => void | Promise<void>, 
  onDelete: () => void | Promise<void>,
  onStatusChange: (status: string) => void | Promise<void>,
  onColorChange: (color: string) => void | Promise<void>,
  onPin: () => void | Promise<void>,
  onSizeChange: (size: 'sm' | 'md' | 'lg') => void | Promise<void>,
  onToggleCollapse: () => void | Promise<void>,
  onPopout: () => void,
  statuses: StatusOption[],
  viewMode: 'compact' | 'full',
  onClick: () => void,
  userSettings: UserSettings,
  onContextMenu: (x: number, y: number, noteId: string) => void,
  key?: string
}) => {
  const currentStatus = statuses.find(s => s.id === note.status) || statuses[0];

  const sizeClasses = {
    sm: 'col-span-1 row-span-1 min-h-[60px]',
    md: 'col-span-1 md:col-span-2 row-span-1 min-h-[100px]',
    lg: 'col-span-1 md:col-span-2 row-span-2 min-h-[200px]'
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onContextMenu={(e) => {
        if (isAdmin) {
          e.preventDefault();
          onContextMenu(e.clientX, e.clientY, note.id);
        }
      }}
      className={`group rounded-[2rem] overflow-hidden card-hover border transition-all duration-500 flex flex-col backdrop-blur-xl relative cursor-pointer ${note.isCollapsed ? 'min-h-0 h-fit' : sizeClasses[note.size || 'sm']} ${note.isPinned ? 'ring-4 ring-primary/30 ring-offset-4' : ''}`}
      style={{ 
        backgroundColor: note.color ? note.color + '11' : (userSettings.theme === 'dark' ? 'rgba(31, 41, 55, 0.4)' : 'rgba(255, 255, 255, 0.4)'),
        borderColor: note.color ? note.color + '33' : 'rgba(255, 255, 255, 0.2)'
      }}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('noteId', note.id);
        e.dataTransfer.effectAllowed = 'link';
      }}
    >
      {note.imageUrl && (
        <div className={`${note.size === 'lg' ? 'h-64' : 'h-40'} overflow-hidden relative`}>
          <img 
            src={note.imageUrl} 
            alt={note.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-60" />
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md" style={{ backgroundColor: currentStatus.color + 'CC' }}>
              {currentStatus.label}
            </span>
            {note.isPinned && (
              <span className="bg-purple-500 text-white p-1 rounded-full shadow-lg">
                <Pin size={10} />
              </span>
            )}
          </div>
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col">
        {!note.imageUrl && (
          <div className="mb-2 flex justify-between items-center">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-sm" style={{ backgroundColor: currentStatus.color }}>
              {currentStatus.label}
            </span>
            {note.isPinned && (
              <span className="text-primary">
                <Pin size={14} fill="currentColor" />
              </span>
            )}
          </div>
        )}
        <div className="flex justify-between items-start mb-2 gap-3">
          <h3 className={`font-display font-bold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors flex-1 ${note.size === 'lg' ? 'text-2xl' : 'text-lg'}`}>{note.title}</h3>
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); onPopout(); }}
              className="p-1.5 rounded-full text-gray-300 hover:bg-gray-100 hover:text-primary transition-colors"
              title="Pop-out Note"
            >
              <ExternalLink size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
              className={`p-1.5 rounded-full transition-colors ${note.isCollapsed ? 'text-purple-500 bg-purple-50' : 'text-gray-300 hover:bg-gray-100'}`}
              title={note.isCollapsed ? "Expand Note" : "Collapse Note"}
            >
              {note.isCollapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onPin(); }}
              className={`p-1.5 rounded-full transition-colors ${note.isPinned ? 'text-purple-500 bg-purple-50' : 'text-gray-300 hover:bg-gray-100'}`}
              title={note.isPinned ? "Unpin Note" : "Pin Note"}
            >
              <Pin size={14} fill={note.isPinned ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onFavorite(); }}
              className={`p-1.5 rounded-full transition-colors ${note.isFavorite ? 'text-yellow-400 bg-yellow-50' : 'text-gray-300 hover:bg-gray-100'}`}
            >
              <Star size={14} fill={note.isFavorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
        
        {!note.isCollapsed && (
          <div 
            className={`text-gray-500 text-sm mb-2 flex-1 prose prose-sm prose-p:my-0.5 prose-headings:my-1 prose-ul:my-1 prose-li:my-0 max-w-none leading-relaxed w-full overflow-hidden note-content ${viewMode === 'compact' && note.size !== 'lg' ? 'line-clamp-4' : (note.size === 'lg' ? 'line-clamp-none' : '')}`}
            dir={!note.alignment ? "auto" : (note.alignment === 'right' ? 'rtl' : (note.alignment === 'left' ? 'ltr' : 'auto'))}
            style={{ 
              textAlign: note.alignment || 'start',
              fontFamily: userSettings.defaultFont,
              fontSize: userSettings.defaultSize || '14px'
            }}
            dangerouslySetInnerHTML={{ __html: note.content }}
          />
        )}

        <div className="flex flex-wrap gap-1.5 mb-2">
          {note.tags.map(tag => (
            <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
              #{tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="flex items-center gap-3 text-gray-400">
            {note.dueDate && (
              <div className={`flex items-center gap-1 text-[10px] font-bold ${isAfter(new Date(), note.dueDate.toDate ? note.dueDate.toDate() : new Date(note.dueDate)) ? 'text-purple-500' : ''}`}>
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
            <div className={`flex items-center gap-1 transition-all ${isMobile() ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}`}>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onContextMenu(e.clientX, e.clientY, note.id);
                }}
                className="p-1.5 hover:bg-gray-100/50 rounded-full text-gray-500 hover:text-purple-500 transition-colors"
                title="Change Card Size"
              >
                <Maximize2 size={14} />
              </button>
              {!isMobile() && (
                <div className="flex bg-gray-100/50 rounded-full p-0.5 mr-1 overflow-x-auto max-w-[120px] no-scrollbar">
                  {statuses.map((s) => (
                    <button
                      key={s.id}
                      onClick={(e) => { e.stopPropagation(); onStatusChange(s.id); }}
                      className={`p-1.5 rounded-full transition-all flex-shrink-0 ${note.status === s.id ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      title={`Mark as ${s.label}`}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    </button>
                  ))}
                </div>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className={`p-1.5 rounded-full transition-all ${isMobile() ? 'bg-purple-500 text-white shadow-md p-2' : 'hover:bg-gray-100/50 text-gray-500 hover:text-purple-500'}`}
                title="Edit Note"
              >
                <Edit2 size={isMobile() ? 16 : 14} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onArchive(); }}
                className="p-1.5 hover:bg-gray-100/50 rounded-full text-gray-500 hover:text-purple-500 transition-colors"
                title={note.isArchived ? "Unarchive" : "Archive"}
              >
                <Archive size={14} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 hover:bg-gray-100/50 rounded-full text-gray-500 hover:text-rose-500 transition-colors"
                title="Delete Note"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

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

interface FloatingWindowProps {
  key?: string | number;
  window: ActiveWindow;
  note: Note;
  notes: Note[];
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  onResize: (width: number, height: number) => void;
  onDrag: (x: number, y: number) => void;
  isAdmin: boolean;
  onEdit: () => void;
  onFavorite: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  onColorChange: (color: string) => void;
  onUpdateNote: (id: string, data: Partial<Note>) => void;
  onContextMenu: (x: number, y: number, noteId: string) => void;
  statuses: StatusOption[];
  userSettings: UserSettings;
  onMaximize: () => void;
  openWindow: (id: string) => void;
  onPopout: () => void;
}

const FloatingWindow = React.memo(({ 
  window: win, 
  note, 
  notes,
  onClose, 
  onMinimize, 
  onFocus, 
  onResize, 
  onDrag,
  isAdmin,
  onEdit,
  onFavorite,
  onArchive,
  onDelete,
  onStatusChange,
  onColorChange,
  onUpdateNote,
  onContextMenu,
  statuses,
  userSettings,
  onMaximize,
  openWindow,
  onPopout
}: FloatingWindowProps) => {
  const mobile = isMobile();
  const currentStatus = statuses.find(s => s.id === note.status) || statuses[0];
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [quickEditContent, setQuickEditContent] = useState(note.content);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  const fetchVersions = async () => {
    setIsLoadingVersions(true);
    try {
      const vPath = `artifacts/${appId}/public/data/notes/${note.id}/versions`;
      const q = query(collection(db, vPath), orderBy('createdAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      setVersions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NoteVersion)));
    } catch (err) {
      console.error("Error fetching versions:", err);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleRestoreVersion = (v: NoteVersion) => {
    onUpdateNote(note.id, { title: v.title, content: v.content });
    setShowHistory(false);
  };

  const backlinks = useMemo(() => {
    return notes.filter(n => n.content.includes(`[[${note.title}]]`) && n.id !== note.id);
  }, [note.title, notes]);

  useEffect(() => {
    setQuickEditContent(note.content);
  }, [note.content]);

  const handleQuickSave = () => {
    onUpdateNote(note.id, { content: quickEditContent });
    setIsQuickEditing(false);
  };

  if (win.isMinimized) return null;

  const windowStyle = win.isMaximized ? {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
    zIndex: win.zIndex,
    position: 'fixed' as const
  } : mobile ? {
    width: '90vw',
    height: '80vh',
    left: '5vw',
    top: '10vh',
    borderRadius: '2.5rem',
    zIndex: win.zIndex,
    position: 'fixed' as const
  } : {
    width: win.width,
    height: win.height,
    left: win.x,
    top: win.y,
    borderRadius: '1.5rem',
    zIndex: win.zIndex,
    position: 'fixed' as const
  };

  return (
      <motion.div
        onContextMenu={(e) => {
          if (isAdmin) {
            e.preventDefault();
            onContextMenu(e.clientX, e.clientY, note.id);
          }
        }}
        initial={mobile ? { opacity: 0, y: 100 } : { opacity: 0, scale: 0.9, x: win.x, y: win.y }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          x: win.isMaximized || mobile ? 0 : win.x,
          y: win.isMaximized || mobile ? 0 : win.y,
          width: win.isMaximized || mobile ? '100%' : win.width,
          height: win.isMaximized || mobile ? '100%' : win.height,
          borderRadius: windowStyle.borderRadius
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        exit={mobile ? { opacity: 0, y: 100 } : { opacity: 0, scale: 0.9 }}
        style={{ 
          zIndex: win.zIndex,
          position: 'fixed'
        }}
        className={`${userSettings.theme === 'dark' ? 'glass-dark' : 'glass'} ambient-shadow flex flex-col overflow-hidden`}
        onClick={onFocus}
      >
      {/* Header / Drag Handle */}
      <div 
        className={`p-4 border-b flex items-center justify-between select-none ${userSettings.theme === 'dark' ? 'bg-gray-800/40' : 'bg-gray-50/40'} ${(mobile || win.isMaximized) ? '' : 'cursor-move'}`}
        onMouseDown={(e) => {
          if (mobile || win.isMaximized) return;
          const startX = e.clientX - win.x;
          const startY = e.clientY - win.y;
          const onMouseMove = (moveEvent: MouseEvent) => {
            onDrag(moveEvent.clientX - startX, moveEvent.clientY - startY);
          };
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: currentStatus.color }} />
          <h3 className="font-bold text-sm text-gray-700 line-clamp-1 md:line-clamp-2">{note.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {mobile && isAdmin && (
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }} 
              className="p-2 bg-purple-500 text-white rounded-xl shadow-md active:scale-95 transition-all mr-1"
              title="Edit Note"
            >
              <Edit2 size={16} />
            </button>
          )}
          <div className="flex items-center gap-1 mr-1 bg-gray-200/50 rounded-lg p-0.5">
            <button 
              onClick={(e) => { e.stopPropagation(); if (!showHistory) { fetchVersions(); } setShowHistory(!showHistory); }}
              className={`p-1 rounded-md transition-all ${showHistory ? 'bg-purple-500 text-white' : 'hover:bg-white text-gray-500'}`}
              title="Version History"
            >
              <History size={12} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setZoomLevel(prev => Math.max(50, prev - 10)); }}
              className="p-1 hover:bg-white rounded-md text-gray-500 transition-all"
              title="Zoom Out"
            >
              <Minus size={12} />
            </button>
            {!mobile && <span className="text-[10px] font-bold text-gray-500 w-8 text-center">{zoomLevel}%</span>}
            <button 
              onClick={(e) => { e.stopPropagation(); setZoomLevel(prev => Math.min(200, prev + 10)); }}
              className="p-1 hover:bg-white rounded-md text-gray-500 transition-all"
              title="Zoom In"
            >
              <Plus size={12} />
            </button>
          </div>
          {!mobile && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onPopout(); }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors" title="Pop-out Window">
                <ExternalLink size={16} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onMaximize(); }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors" title={win.isMaximized ? "Restore" : "Maximize"}>
                {win.isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onMinimize(); }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors" title="Minimize">
                <Minus size={16} />
              </button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1.5 hover:bg-purple-100 hover:text-purple-500 rounded-lg text-gray-500 transition-colors" title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        <div 
          className={`flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-12 max-w-none w-full note-content ${!isQuickEditing ? 'prose prose-lg' : ''} ${userSettings.theme === 'dark' ? 'bg-gray-900/40' : 'bg-white/40'}`} 
          dir={!note.alignment ? "auto" : (note.alignment === 'right' ? 'rtl' : (note.alignment === 'left' ? 'ltr' : 'auto'))}
          style={{ 
            fontFamily: userSettings.defaultFont, 
            fontSize: `calc(${userSettings.defaultSize || '16px'} * ${zoomLevel / 100})`, 
            textAlign: note.alignment || userSettings.defaultAlignment || 'start'
          }}
        >
          {isQuickEditing ? (
            <div className="h-full flex flex-col gap-4 min-h-[300px]">
              <ReactQuill
                theme="snow"
                value={quickEditContent}
                onChange={setQuickEditContent}
                modules={{ toolbar: false }}
                className="flex-1 bg-white rounded-2xl overflow-hidden border border-gray-200"
                placeholder="Quickly edit your note content..."
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setIsQuickEditing(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleQuickSave}
                  className="px-4 py-2 text-sm font-bold bg-purple-500 text-white rounded-xl shadow-lg hover:bg-purple-600 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <>
              <div dangerouslySetInnerHTML={{ __html: note.content }} />
              
              {/* Backlinks Section */}
              <div className="mt-20 pt-8 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <LinkIcon size={14} /> Backlinks
                </h4>
                <div className="flex flex-wrap gap-2">
                  {backlinks.map(bn => (
                    <button
                      key={bn.id}
                      onClick={() => openWindow(bn.id)}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all"
                    >
                      {bn.title}
                    </button>
                  ))}
                  {backlinks.length === 0 && (
                    <span className="text-xs text-gray-400 italic">No backlinks found</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Version History Sidebar */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              className="w-64 border-l border-gray-100 bg-gray-50 overflow-y-auto p-4 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-gray-700">History</h4>
                <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-gray-200 rounded-lg">
                  <X size={14} />
                </button>
              </div>
              {isLoadingVersions ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleRestoreVersion(v)}
                      className="w-full text-left p-3 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group"
                    >
                      <div className="text-[10px] text-gray-400 font-bold mb-1">
                        {v.createdAt?.toDate().toLocaleString()}
                      </div>
                      <div className="text-xs font-bold text-gray-700 line-clamp-1 group-hover:text-purple-600">
                        {v.title}
                      </div>
                    </button>
                  ))}
                  {versions.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-400 italic">
                      No previous versions
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Actions */}
      <div className={`p-4 border-t flex items-center justify-between ${userSettings.theme === 'dark' ? 'bg-gray-800/40' : 'bg-gray-50/40'}`}>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button onClick={onEdit} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                <Edit2 size={14} /> Full Editor
              </button>
              {!isQuickEditing && (
                <button 
                  onClick={() => setIsQuickEditing(true)} 
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-xl text-xs font-bold text-purple-600 hover:bg-purple-100 transition-colors"
                >
                  <Type size={14} /> Quick Edit
                </button>
              )}
            </>
          )}
          <button onClick={onFavorite} className={`p-1.5 rounded-xl transition-colors ${note.isFavorite ? 'text-yellow-400 bg-yellow-50' : 'text-gray-400 hover:bg-white'}`}>
            <Star size={16} fill={note.isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="text-[10px] font-bold text-gray-400">
          Last updated: {note.updatedAt ? format(note.updatedAt.toDate(), 'MMM d, HH:mm') : 'Just now'}
        </div>
      </div>

      {/* Resize Handles */}
      {!mobile && (
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10"
          onMouseDown={(e) => {
            e.stopPropagation();
            const startWidth = win.width;
            const startHeight = win.height;
            const startX = e.clientX;
            const startY = e.clientY;
            const onMouseMove = (moveEvent: MouseEvent) => {
              onResize(
                Math.max(300, startWidth + (moveEvent.clientX - startX)),
                Math.max(200, startHeight + (moveEvent.clientY - startY))
              );
            };
            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
        />
      )}
    </motion.div>
  );
});

const TaskSidebar = React.memo(({ 
  isOpen, 
  onClose, 
  isPinned, 
  onTogglePin, 
  tasks, 
  taskLists, 
  activeListId, 
  onSelectList, 
  onAddTask, 
  onToggleTask, 
  onDeleteTask, 
  onAddList, 
  onFavoriteList,
  onDeleteList,
  onPinTask,
  onUpdateTask,
  onUpdateList,
  onMoveTask,
  notes,
  onOpenNote
}: {
  isOpen: boolean;
  onClose: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
  tasks: Task[];
  taskLists: TaskList[];
  activeListId: string | null;
  onSelectList: (id: string) => void;
  onAddTask: (title: string, noteId?: string) => void;
  onToggleTask: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
  onAddList: (name: string) => void;
  onFavoriteList: (id: string, favorite: boolean) => void;
  onDeleteList: (id: string) => void;
  onPinTask: (id: string, pinned: boolean) => void;
  onUpdateTask: (id: string, data: Partial<Task>) => void;
  onUpdateList: (id: string, name: string) => void;
  onMoveTask: (taskId: string, listId: string) => void;
  notes: Note[];
  onOpenNote: (noteId: string) => void;
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newListName, setNewListName] = useState('');
  const [showAddList, setShowAddList] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');

  const [showArchive, setShowArchive] = useState(false);

  const activeList = taskLists.find(l => l.id === activeListId);
  const filteredTasks = tasks.filter(t => t.listId === activeListId && !t.isArchived);
  const archivedTasks = tasks.filter(t => t.listId === activeListId && t.isArchived);
  const legacyArchivedTasks = tasks.filter(t => t.isArchived && !taskLists.some(l => l.id === t.listId));
  const pinnedTasks = filteredTasks.filter(t => t.isPinned);
  const unpinnedTasks = filteredTasks.filter(t => !t.isPinned);

  if (!isOpen && !isPinned) return null;

  return (
    <motion.aside
      initial={isPinned ? { width: 320 } : { x: 320 }}
      animate={isPinned ? { width: 320 } : { x: 0 }}
      exit={isPinned ? { width: 0 } : { x: 320 }}
      className={`bg-white border-l border-gray-100 flex flex-col transition-all duration-300 z-[40] ${isPinned ? 'relative h-[calc(100vh-80px)] sticky top-20' : 'fixed right-0 top-20 h-[calc(100vh-80px)] shadow-2xl'}`}
      style={{ width: 320 }}
    >
      <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500 text-white rounded-xl shadow-lg">
            <CheckSquare size={20} />
          </div>
          <h2 className="font-bold text-lg text-gray-900">Tasks</h2>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onTogglePin}
            className={`p-2 rounded-lg transition-colors ${isPinned ? 'text-purple-500 bg-purple-50' : 'text-gray-400 hover:bg-gray-100'}`}
            title={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
          >
            <Pin size={16} fill={isPinned ? "currentColor" : "none"} />
          </button>
          {!isPinned && (
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {/* List Selector */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">My Lists</h3>
            <button 
              onClick={() => setShowAddList(!showAddList)}
              className="p-1 text-purple-500 hover:bg-purple-50 rounded-md transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          
          {showAddList && (
            <div className="mb-4 flex gap-2">
              <input 
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="New list name..."
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newListName.trim()) {
                    onAddList(newListName.trim());
                    setNewListName('');
                    setShowAddList(false);
                  }
                }}
              />
            </div>
          )}

          <div className="space-y-1">
            {taskLists.map(list => (
              <div key={list.id} className="group flex items-center justify-between">
                {editingListId === list.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingListName}
                    onChange={(e) => setEditingListName(e.target.value)}
                    onBlur={() => {
                      if (editingListName.trim() && editingListName !== list.name) {
                        onUpdateList(list.id, editingListName.trim());
                      }
                      setEditingListId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingListName.trim() && editingListName !== list.name) {
                          onUpdateList(list.id, editingListName.trim());
                        }
                        setEditingListId(null);
                      }
                      if (e.key === 'Escape') setEditingListId(null);
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-purple-300 rounded-xl text-sm focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => onSelectList(list.id)}
                    className={`flex-1 text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${activeListId === list.id ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {list.name}
                  </button>
                )}
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingListId(list.id);
                      setEditingListName(list.name);
                    }}
                    className="p-1.5 text-gray-300 hover:text-rose-500 rounded-lg transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => onFavoriteList(list.id, !list.isFavorite)}
                    className={`p-1.5 rounded-lg transition-colors ${list.isFavorite ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                  >
                    <Star size={14} fill={list.isFavorite ? "currentColor" : "none"} />
                  </button>
                  {taskLists.length > 1 && (
                    <button 
                      onClick={() => onDeleteList(list.id)}
                      className="p-1.5 text-gray-300 hover:text-rose-500 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Task */}
        <div 
          className="relative"
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('bg-purple-50');
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove('bg-purple-50');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('bg-purple-50');
            const noteId = e.dataTransfer.getData('noteId');
            if (noteId) {
              const note = notes.find(n => n.id === noteId);
              if (note) {
                onAddTask(note.title, note.id);
              }
            }
          }}
        >
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:border-purple-300 transition-all group relative">
            <Plus size={20} className="text-gray-400 group-hover:text-purple-500 mt-1" />
            <div className="flex-1">
              <textarea 
                rows={1}
                value={newTaskTitle}
                onChange={(e) => {
                  setNewTaskTitle(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                placeholder="Add a task..."
                className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full placeholder:text-gray-400 resize-none overflow-hidden py-1 leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && newTaskTitle.trim()) {
                    e.preventDefault();
                    onAddTask(newTaskTitle.trim());
                    setNewTaskTitle('');
                    e.currentTarget.style.height = 'auto';
                  }
                }}
              />
            </div>

            <AnimatePresence>
              {newTaskTitle.length > 30 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-full left-0 right-0 mb-4 p-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-100 z-[60] pointer-events-none"
                >
                  <div className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Type size={12} /> Full Task Preview
                  </div>
                  <p className="text-sm text-gray-700 font-medium leading-relaxed break-words">
                    {newTaskTitle}
                  </p>
                  <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white border-r border-b border-purple-100 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 px-2">Tip: Drag a note here to link it as a task</p>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {pinnedTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-purple-500 uppercase tracking-widest flex items-center gap-2">
                <Pin size={10} /> Pinned
              </h4>
              <div className="space-y-1.5">
                {pinnedTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={onToggleTask} 
                    onDelete={onDeleteTask} 
                    onPin={onPinTask}
                    onMove={onMoveTask}
                    onUpdate={onUpdateTask}
                    taskLists={taskLists}
                    note={notes.find(n => n.id === task.noteId)}
                    onClick={() => task.noteId && onOpenNote(task.noteId)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {unpinnedTasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onToggle={onToggleTask} 
                onDelete={onDeleteTask} 
                onPin={onPinTask}
                onMove={onMoveTask}
                onUpdate={onUpdateTask}
                taskLists={taskLists}
                note={notes.find(n => n.id === task.noteId)}
                onClick={() => task.noteId && onOpenNote(task.noteId)}
              />
            ))}
          </div>
        </div>

        {/* Archive Section */}
        {archivedTasks.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <button 
              onClick={() => setShowArchive(!showArchive)}
              className="w-full flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-purple-500 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Archive size={10} /> Archive ({archivedTasks.length})
              </div>
              {showArchive ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
            
            {showArchive && (
              <div className="mt-3 space-y-1.5 opacity-60 hover:opacity-100 transition-opacity">
                {archivedTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={onToggleTask} 
                    onDelete={onDeleteTask} 
                    onPin={onPinTask}
                    onMove={onMoveTask}
                    onUpdate={onUpdateTask}
                    taskLists={taskLists}
                    note={notes.find(n => n.id === task.noteId)}
                    onClick={() => task.noteId && onOpenNote(task.noteId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {/* Legacy Archive Section */}
        {legacyArchivedTasks.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <button 
              onClick={() => setShowArchive(!showArchive)}
              className="w-full flex items-center justify-between text-[10px] font-bold text-rose-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
            >
              <div className="flex items-center gap-2">
                <History size={10} /> Legacy Archive ({legacyArchivedTasks.length})
              </div>
              {showArchive ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
            
            {showArchive && (
              <div className="mt-3 space-y-1.5 opacity-60 hover:opacity-100 transition-opacity">
                {legacyArchivedTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={onToggleTask} 
                    onDelete={onDeleteTask} 
                    onPin={onPinTask}
                    onMove={onMoveTask}
                    onUpdate={onUpdateTask}
                    taskLists={taskLists}
                    note={notes.find(n => n.id === task.noteId)}
                    onClick={() => task.noteId && onOpenNote(task.noteId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.aside>
  );
});

interface TaskItemProps {
  key?: string | number;
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onMove: (taskId: string, listId: string) => void;
  taskLists: TaskList[];
  note?: Note;
  onClick?: () => void;
}

const TaskItem = React.memo(({ 
  task, 
  onToggle, 
  onDelete, 
  onPin,
  onMove,
  taskLists,
  note,
  onUpdate,
  onClick
}: TaskItemProps & { onUpdate?: (id: string, data: Partial<Task>) => void }) => { 
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleUpdate = () => {
    if (onUpdate && editTitle.trim()) {
      onUpdate(task.id, { title: editTitle.trim() });
      setIsEditing(false);
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex items-start gap-2 p-1.5 rounded-xl transition-all border ${task.isCompleted ? 'bg-gray-50 border-transparent opacity-60' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'} ${task.noteId ? 'cursor-pointer' : ''}`}
      onClick={() => task.noteId && note && onClick?.()}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); onToggle(task.id, !task.isCompleted); }}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${task.isCompleted ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-200 hover:border-purple-400'}`}
      >
        {task.isCompleted && <CheckSquare size={12} />}
      </button>
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <input 
              autoFocus
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdate();
                if (e.key === 'Escape') { setIsEditing(false); setEditTitle(task.title); }
              }}
            />
            <div className="flex gap-2">
              <button onClick={handleUpdate} className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Save</button>
              <button onClick={() => { setIsEditing(false); setEditTitle(task.title); }} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <p className={`text-xs font-medium break-normal w-full leading-relaxed ${task.isCompleted ? 'text-gray-400 line-through' : (note ? 'text-rose-600 hover:underline' : 'text-gray-700')}`}>
              {task.title}
            </p>
            {note && (
              <div className="flex items-center gap-1 mt-0.5">
                <ExternalLink size={10} className="text-rose-400" />
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider truncate">Linked Note</span>
              </div>
            )}
          </>
        )}
      </div>
      <div className="relative shrink-0">
        <button 
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="p-1.5 text-gray-300 hover:text-rose-500 rounded-lg transition-colors"
          title="More options"
        >
          <MoreHorizontal size={16} />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-[101]">
              <button 
                onClick={() => { onPin(task.id, !task.isPinned); setShowMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <Pin size={14} className={task.isPinned ? 'text-rose-500' : ''} fill={task.isPinned ? "currentColor" : "none"} />
                {task.isPinned ? 'Unpin Task' : 'Pin Task'}
              </button>
              <button 
                onClick={() => { setIsEditing(true); setShowMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit2 size={14} />
                Edit Task
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <div className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Move to List</div>
              {taskLists.map(list => (
                <button
                  key={list.id}
                  onClick={() => { onMove(task.id, list.id); setShowMenu(false); }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${task.listId === list.id ? 'text-rose-500 font-bold' : 'text-gray-600'}`}
                >
                  <FolderInput size={14} />
                  {list.name}
                </button>
              ))}
              <div className="h-px bg-gray-100 my-1" />
              <button 
                onClick={() => { onDelete(task.id); setShowMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm text-rose-500 hover:bg-rose-50 flex items-center gap-2"
              >
                <Trash2 size={14} />
                Delete Task
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
});

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6 text-purple-400">
      <Search size={40} />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">No results found</h3>
    <p className="text-gray-500 max-w-xs mx-auto">{message}</p>
  </div>
);

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'board' | 'archive' | 'favorites' | 'due' | 'workflow' | 'canvas'>('board');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [isQuickNote, setIsQuickNote] = useState(false);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [editNoteData, setEditNoteData] = useState<Note | null>(null);
  const [editFolderData, setEditFolderData] = useState<FolderType | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchEverywhere, setSearchEverywhere] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [statuses, setStatuses] = useState<StatusOption[]>([
    { id: 'todo', label: 'Todo', color: '#3B82F6', isVisible: true },
    { id: 'in-progress', label: 'In Progress', color: '#F97316', isVisible: true },
    { id: 'done', label: 'Done', color: '#22C55E', isVisible: true }
  ]);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    defaultFont: 'Inter',
    defaultSize: '16px',
    defaultAlignment: 'left',
    cardViewMode: 'compact',
    defaultFolderId: null,
    defaultTaskListId: null,
    startupFolderId: null,
    startupTaskListId: null,
    enableNotifications: false,
    isSidebarCollapsed: false,
    gridColumns: 3,
    notesPerColumn: 10,
    sortBy: 'date',
    theme: 'light',
    boardTheme: '#F9F7FF'
  });
  const [activeWindows, setActiveWindows] = useState<ActiveWindow[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(100);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const quillWrapperRef = useRef<HTMLDivElement>(null);
  const hasInitializedStartup = useRef(false);

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const addToHistory = useCallback((action: any) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(action);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleUndo = useCallback(async () => {
    if (historyIndex < 0) return;
    const action = history[historyIndex];
    
    try {
      if (action.type === 'note') {
        const path = `artifacts/${appId}/public/data/notes`;
        if (action.action === 'delete') {
          await setDoc(doc(db, path, action.id), action.data);
        } else if (action.action === 'create') {
          await deleteDoc(doc(db, path, action.id));
        } else if (action.action === 'update') {
          await updateDoc(doc(db, path, action.id), action.oldData);
        }
      } else if (action.type === 'task') {
        const path = `artifacts/${appId}/public/data/tasks`;
        if (action.action === 'delete') {
          await setDoc(doc(db, path, action.id), action.data);
        } else if (action.action === 'create') {
          await deleteDoc(doc(db, path, action.id));
        } else if (action.action === 'update') {
          await updateDoc(doc(db, path, action.id), action.oldData);
        }
      }
      setHistoryIndex(prev => prev - 1);
    } catch (err) {
      console.error("Undo failed:", err);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(async () => {
    if (historyIndex >= history.length - 1) return;
    const action = history[historyIndex + 1];
    
    try {
      if (action.type === 'note') {
        const path = `artifacts/${appId}/public/data/notes`;
        if (action.action === 'delete') {
          await deleteDoc(doc(db, path, action.id));
        } else if (action.action === 'create') {
          await setDoc(doc(db, path, action.id), action.data);
        } else if (action.action === 'update') {
          await updateDoc(doc(db, path, action.id), action.newData);
        }
      } else if (action.type === 'task') {
        const path = `artifacts/${appId}/public/data/tasks`;
        if (action.action === 'delete') {
          await deleteDoc(doc(db, path, action.id));
        } else if (action.action === 'create') {
          await setDoc(doc(db, path, action.id), action.data);
        } else if (action.action === 'update') {
          await updateDoc(doc(db, path, action.id), action.newData);
        }
      }
      setHistoryIndex(prev => prev + 1);
    } catch (err) {
      console.error("Redo failed:", err);
    }
  }, [historyIndex, history]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Task State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [activeTaskListId, setActiveTaskListId] = useState<string | null>(null);
  const [isTaskSidebarOpen, setIsTaskSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('isTaskSidebarOpen');
    return saved ? JSON.parse(saved) : false;
  });
  const [isTaskSidebarPinned, setIsTaskSidebarPinned] = useState(() => {
    const saved = localStorage.getItem('isTaskSidebarPinned');
    return saved ? JSON.parse(saved) : false;
  });

  const [showDensityPopover, setShowDensityPopover] = useState(false);
  const [showBgPopover, setShowBgPopover] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'board' | 'note', noteId?: string } | null>(null);

  useEffect(() => {
    localStorage.setItem('isTaskSidebarOpen', JSON.stringify(isTaskSidebarOpen));
  }, [isTaskSidebarOpen]);

  useEffect(() => {
    localStorage.setItem('isTaskSidebarPinned', JSON.stringify(isTaskSidebarPinned));
  }, [isTaskSidebarPinned]);

  // Rich Text Editor State
  const [editorContent, setEditorContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteFolderId, setNoteFolderId] = useState<string | null>(null);
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [noteDueDate, setNoteDueDate] = useState<string>('');
  const [noteImageUrl, setNoteImageUrl] = useState<string>('');
  const [noteStatus, setNoteStatus] = useState<string>('todo');
  const [noteColor, setNoteColor] = useState<string>('');
  const [noteAlignment, setNoteAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');

  const focusWindow = useCallback((id: string) => {
    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ);
    setActiveWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: newZ } : w));
  }, [maxZIndex]);

  const toggleMinimizeWindow = useCallback((id: string) => {
    setActiveWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
  }, []);

  const openWindow = useCallback((noteId: string, type: 'view' | 'edit' = 'view') => {
    const isMobile = window.innerWidth < 768;
    const existing = activeWindows.find(w => w.noteId === noteId && w.type === type);
    if (existing) {
      focusWindow(existing.id);
      if (existing.isMinimized) {
        toggleMinimizeWindow(existing.id);
      }
      return;
    }

    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ);
    
    const newWindow: ActiveWindow = {
      id: `win-${Date.now()}`,
      noteId,
      type,
      x: isMobile ? 0 : 100 + (activeWindows.length * 30) % 300,
      y: isMobile ? 0 : 100 + (activeWindows.length * 30) % 300,
      width: isMobile ? window.innerWidth : 800,
      height: isMobile ? window.innerHeight : 600,
      isMinimized: false,
      isMaximized: false,
      zIndex: newZ
    };
    setActiveWindows(prev => [...prev, newWindow]);
  }, [activeWindows, focusWindow, maxZIndex, toggleMinimizeWindow]);

  const closeWindow = (id: string) => {
    setActiveWindows(prev => prev.filter(w => w.id !== id));
  };

  const toggleMaximizeWindow = (id: string) => {
    setActiveWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  };

  const updateWindowPos = (id: string, x: number, y: number) => {
    setActiveWindows(prev => prev.map(w => w.id === id ? { ...w, x, y } : w));
  };

  const updateWindowSize = (id: string, width: number, height: number) => {
    setActiveWindows(prev => prev.map(w => w.id === id ? { ...w, width, height } : w));
  };

  const handleAddTask = async (title: string, noteId?: string) => {
    if (!user || !activeTaskListId) return;
    const path = `artifacts/${appId}/public/data/tasks`;
    try {
      const taskData = {
        title,
        isCompleted: false,
        isPinned: false,
        listId: activeTaskListId,
        noteId: noteId || null,
        createdAt: serverTimestamp(),
        uid: user.uid
      };
      const docRef = await addDoc(collection(db, path), taskData);
      addToHistory({ type: 'task', action: 'create', id: docRef.id, data: taskData });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  // Notification Logic
  useEffect(() => {
    if (!userSettings.enableNotifications || !("Notification" in window)) return;

    const checkDueDates = () => {
      const now = new Date();
      notes.forEach(note => {
        if (note.dueDate && !note.isArchived) {
          const due = note.dueDate.toDate ? note.dueDate.toDate() : new Date(note.dueDate);
          const diff = due.getTime() - now.getTime();
          // Notify if due in the next 15 minutes and not already notified
          if (diff > 0 && diff < 15 * 60 * 1000) {
            const notifiedKey = `notified_note_${note.id}`;
            if (!localStorage.getItem(notifiedKey)) {
              new Notification("Note Reminder", {
                body: `Note "${note.title}" is due soon!`,
                icon: "/favicon.ico"
              });
              localStorage.setItem(notifiedKey, "true");
            }
          }
        }
      });

      tasks.forEach(task => {
        if (task.dueDate && !task.isCompleted) {
          const due = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
          const diff = due.getTime() - now.getTime();
          if (diff > 0 && diff < 15 * 60 * 1000) {
            const notifiedKey = `notified_task_${task.id}`;
            if (!localStorage.getItem(notifiedKey)) {
              new Notification("Task Reminder", {
                body: `Task "${task.title}" is due soon!`,
                icon: "/favicon.ico"
              });
              localStorage.setItem(notifiedKey, "true");
            }
          }
        }
      });
    };

    const interval = setInterval(checkDueDates, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [notes, tasks, userSettings.enableNotifications]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setUserSettings(prev => ({ ...prev, enableNotifications: true }));
    } else {
      setUserSettings(prev => ({ ...prev, enableNotifications: false }));
    }
  };

  const handleToggleTask = async (id: string, isCompleted: boolean) => {
    const path = `artifacts/${appId}/public/data/tasks/${id}`;
    try {
      const oldTask = tasks.find(t => t.id === id);
      if (oldTask) {
        const oldData = { ...oldTask };
        const updateData: any = { isCompleted };
        if (isCompleted) {
          updateData.isArchived = true;
        } else {
          updateData.isArchived = false;
        }
        await updateDoc(doc(db, path), updateData);
        addToHistory({ type: 'task', action: 'update', id, oldData, newData: { ...oldTask, ...updateData } });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleUpdateTask = async (id: string, data: Partial<Task>) => {
    if (!user || !isAdmin) return;
    const path = `artifacts/${appId}/public/data/tasks/${id}`;
    try {
      await updateDoc(doc(db, path), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handlePinTask = async (id: string, isPinned: boolean) => {
    const path = `artifacts/${appId}/public/data/tasks/${id}`;
    try {
      await updateDoc(doc(db, path), { isPinned });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const path = `artifacts/${appId}/public/data/tasks/${id}`;
    try {
      const task = tasks.find(t => t.id === id);
      if (task) {
        await deleteDoc(doc(db, path));
        addToHistory({ type: 'task', action: 'delete', id, data: task });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleAddTaskList = async (name: string) => {
    if (!user) return;
    const path = `artifacts/${appId}/public/data/taskLists`;
    try {
      const docRef = await addDoc(collection(db, path), {
        name,
        isFavorite: false,
        createdAt: serverTimestamp(),
        uid: user.uid
      });
      setActiveTaskListId(docRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleFavoriteTaskList = async (id: string, isFavorite: boolean) => {
    const path = `artifacts/${appId}/public/data/taskLists/${id}`;
    try {
      await updateDoc(doc(db, path), { isFavorite });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteTaskList = async (id: string) => {
    const path = `artifacts/${appId}/public/data/taskLists/${id}`;
    try {
      // Delete non-archived tasks in this list
      const listTasks = tasks.filter(t => t.listId === id);
      const batch = writeBatch(db);
      listTasks.forEach(task => {
        if (!task.isArchived) {
          const taskPath = `artifacts/${appId}/public/data/tasks/${task.id}`;
          batch.delete(doc(db, taskPath));
        }
      });
      await batch.commit();

      await deleteDoc(doc(db, path));
      if (activeTaskListId === id) {
        setActiveTaskListId(taskLists.find(l => l.id !== id)?.id || null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleUpdateTaskList = async (id: string, name: string) => {
    const path = `artifacts/${appId}/public/data/taskLists/${id}`;
    try {
      await updateDoc(doc(db, path), { name });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleMoveTask = async (taskId: string, listId: string) => {
    const path = `artifacts/${appId}/public/data/tasks/${taskId}`;
    try {
      await updateDoc(doc(db, path), { listId });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

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
      if (u && (u.email === 'admin@notes.com' || u.email === 'yossi.levi011@gmail.com' || u.uid === 'qelYRH3ns4daioIRieNXWU2hvpA2')) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const updateUserSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = { ...userSettings, ...newSettings };
    setUserSettings(updated);
    if (isAdmin) {
      const sDoc = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global');
      try {
        await setDoc(sDoc, { userSettings: updated }, { merge: true });
      } catch (err) {
        console.error("Error updating settings:", err);
      }
    }
  };

  // Fetch Folders
  useEffect(() => {
    if (!user || !isAdmin) return;
    const fCol = collection(db, 'artifacts', appId, 'public', 'data', 'folders');
    const unsubscribe = onSnapshot(fCol, (snapshot) => {
      const fs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FolderType));
      setFolders(fs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, fCol.path);
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  // Fetch Notes
  useEffect(() => {
    if (!user || !isAdmin) return;
    const nCol = collection(db, 'artifacts', appId, 'public', 'data', 'notes');
    const unsubscribe = onSnapshot(nCol, (snapshot) => {
      const ns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
      setNotes(ns.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, nCol.path);
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  // Fetch Settings
  useEffect(() => {
    if (!user || !isAdmin) return;
    const sDoc = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global');
    const unsubscribe = onSnapshot(sDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.statuses) setStatuses(data.statuses);
        if (data.userSettings) {
          setUserSettings(data.userSettings);
          
          // Initialize startup view once
          if (!hasInitializedStartup.current) {
            if (data.userSettings.startupFolderId) {
              setCurrentFolderId(data.userSettings.startupFolderId);
            }
            if (data.userSettings.startupTaskListId) {
              setActiveTaskListId(data.userSettings.startupTaskListId);
            }
            hasInitializedStartup.current = true;
          }
        }
      }
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  // Fetch Task Lists
  useEffect(() => {
    if (!user || !isAdmin) return;
    const tlCol = collection(db, 'artifacts', appId, 'public', 'data', 'taskLists');
    const q = query(tlCol, where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskList));
      setTaskLists(tls.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      if (tls.length > 0 && !activeTaskListId) {
        setActiveTaskListId(tls[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, tlCol.path);
    });
    return () => unsubscribe();
  }, [user, isAdmin, activeTaskListId]);

  // Fetch Tasks
  useEffect(() => {
    if (!user || !isAdmin) return;
    const tCol = collection(db, 'artifacts', appId, 'public', 'data', 'tasks');
    const q = query(tCol, where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(ts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, tCol.path);
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

  const handlePaste = useCallback((e: any) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData)?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault(); // Prevent double paste
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setEditorContent(prev => prev + `<p><img src="${base64}" /></p>`);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (showAddNoteModal && quillWrapperRef.current) {
      const editor = quillWrapperRef.current.querySelector('.ql-editor');
      if (editor) {
        editor.addEventListener('paste', handlePaste);
        return () => editor.removeEventListener('paste', handlePaste);
      }
    }
  }, [showAddNoteModal, handlePaste]);

  useEffect(() => {
    if (editNoteData) {
      setNoteTitle(editNoteData.title);
      setEditorContent(editNoteData.content);
      setNoteFolderId(editNoteData.folderId);
      setNoteTags(editNoteData.tags);
      setNoteDueDate(editNoteData.dueDate ? (editNoteData.dueDate.toDate ? format(editNoteData.dueDate.toDate(), 'yyyy-MM-dd') : format(new Date(editNoteData.dueDate), 'yyyy-MM-dd')) : '');
      setNoteImageUrl(editNoteData.imageUrl || '');
      setNoteStatus(editNoteData.status);
      setNoteColor(editNoteData.color || '');
      setNoteAlignment(editNoteData.alignment || userSettings.defaultAlignment);
      setShowAddNoteModal(true);
    }
  }, [editNoteData, userSettings.defaultAlignment]);

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
    if (!isAdmin || !user) return;
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
        color: noteColor,
        isFavorite: editNoteData?.isFavorite || false,
        isArchived: editNoteData?.isArchived || false,
        isPinned: editNoteData?.isPinned || false,
        size: editNoteData?.size || 'sm',
        alignment: noteAlignment,
        updatedAt: serverTimestamp(),
        uid: user.uid
      };

      if (editNoteData) {
        const oldData = { ...editNoteData };
        const docRef = doc(db, path, editNoteData.id);
        await updateDoc(docRef, noteData);
        addToHistory({ type: 'note', action: 'update', id: editNoteData.id, oldData, newData: noteData });
        setEditNoteData(null);
      } else {
        const docRef = await addDoc(collection(db, path), {
          ...noteData,
          createdAt: serverTimestamp()
        });
        addToHistory({ type: 'note', action: 'create', id: docRef.id, data: noteData });
      }
      setShowAddNoteModal(false);
      resetNoteForm();
    } catch (err) {
      handleFirestoreError(err, editNoteData ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleUpdateNote = useCallback(async (id: string, data: Partial<Note>) => {
    if (!isAdmin) return;
    const path = `artifacts/${appId}/public/data/notes/${id}`;
    try {
      const oldNote = notes.find(n => n.id === id);
      if (oldNote) {
        const oldData = { ...oldNote };
        await updateDoc(doc(db, path), {
          ...data,
          updatedAt: serverTimestamp()
        });
        
        // Save version if content or title changed
        if (data.content !== undefined || data.title !== undefined) {
          const vPath = `artifacts/${appId}/public/data/notes/${id}/versions`;
          await addDoc(collection(db, vPath), {
            noteId: id,
            title: data.title !== undefined ? data.title : oldNote.title,
            content: data.content !== undefined ? data.content : oldNote.content,
            createdAt: serverTimestamp(),
            uid: user?.uid
          });
        }

        addToHistory({ type: 'note', action: 'update', id, oldData, newData: { ...oldNote, ...data } });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }, [isAdmin, appId, notes, user?.uid, addToHistory]);

  const handlePinNote = async (id: string, isPinned: boolean) => {
    handleUpdateNote(id, { isPinned });
  };

  const handleSizeNote = async (id: string, size: 'sm' | 'md' | 'lg') => {
    handleUpdateNote(id, { size });
  };

  const handleToggleCollapse = async (id: string, isCollapsed: boolean) => {
    handleUpdateNote(id, { isCollapsed });
  };

  const handleToggleAllCollapse = async (isCollapsed: boolean) => {
    if (!isAdmin) return;
    const batch = writeBatch(db);
    filteredNotes.forEach(note => {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'notes', note.id);
      batch.update(docRef, { isCollapsed });
    });
    await batch.commit();
  };


  const handleDuplicateNote = async (note: Note) => {
    if (!isAdmin || !user) return;
    const path = `artifacts/${appId}/public/data/notes`;
    try {
      const { id, createdAt, updatedAt, ...rest } = note;
      const docRef = await addDoc(collection(db, path), {
        ...rest,
        title: `${rest.title} (Copy)`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        uid: user.uid
      });
      addToHistory({ type: 'note', action: 'create', id: docRef.id, data: rest });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const resetNoteForm = () => {
    setNoteTitle('');
    setEditorContent(userSettings.defaultAlignment === 'right' ? '<p dir="rtl"></p>' : '');
    setNoteFolderId(userSettings.defaultFolderId);
    setNoteTags([]);
    setNoteDueDate('');
    setNoteImageUrl('');
    setNoteStatus(statuses[0]?.id || 'todo');
    setNoteColor('');
    setNoteAlignment(userSettings.defaultAlignment);
  };

  const handleAddFolder = async (name: string, parentId: string | null, wallpaper: string = '') => {
    if (!isAdmin || !name.trim()) return;
    const path = `artifacts/${appId}/public/data/folders`;
    try {
      if (editFolderData) {
        const docRef = doc(db, path, editFolderData.id);
        await updateDoc(docRef, { name, parentId, wallpaper });
        setEditFolderData(null);
      } else {
        await addDoc(collection(db, path), {
          name,
          parentId,
          wallpaper,
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

  const updateNoteStatus = async (noteId: string, newStatus: string) => {
    if (!isAdmin) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'notes', noteId);
    await updateDoc(docRef, { status: newStatus, updatedAt: serverTimestamp() });
  };

  const updateNoteColor = async (noteId: string, color: string) => {
    if (!isAdmin) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'notes', noteId);
    await updateDoc(docRef, { color, updatedAt: serverTimestamp() });
  };

  const updateFolderBackground = async (folderId: string, background: string) => {
    if (!isAdmin) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'folders', folderId);
    await updateDoc(docRef, { background, updatedAt: serverTimestamp() });
  };

  const updateStatusBackground = async (statusId: string, background: string) => {
    if (!isAdmin) return;
    // For workflow board, we might want to set background per status column
    setStatuses(prev => prev.map(s => s.id === statusId ? { ...s, background } : s));
    // In a real app, this would be saved to Firestore
  };

  const deleteNote = async (id: string) => {
    if (!isAdmin) return;
    const note = notes.find(n => n.id === id);
    if (note) {
      const path = `artifacts/${appId}/public/data/notes/${id}`;
      await deleteDoc(doc(db, path));
      addToHistory({ type: 'note', action: 'delete', id, data: note });
    }
  };

  const deleteFolder = async (id: string) => {
    if (!isAdmin || !confirm("Delete this folder? Notes inside will not be deleted but will lose their folder association.")) return;
    const path = `artifacts/${appId}/public/data/folders`;
    try {
      await deleteDoc(doc(db, path, id));
      // Update notes that were in this folder
      const notesInFolder = notes.filter(n => n.folderId === id);
      for (const note of notesInFolder) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', note.id), { folderId: null });
      }
      if (currentFolderId === id) setCurrentFolderId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           note.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFolder = (currentFolderId && !searchEverywhere) ? note.folderId === currentFolderId : true;
      const matchesTags = selectedTags.length > 0 ? selectedTags.every(t => note.tags.includes(t)) : true;
      const matchesStatus = statusFilter === 'all' ? true : note.status === statusFilter;
      
      const baseFilter = matchesSearch && matchesTags && matchesStatus;

      if (viewMode === 'archive') return note.isArchived && baseFilter;
      if (viewMode === 'favorites') return note.isFavorite && !note.isArchived && baseFilter;
      if (viewMode === 'due') {
        if (!note.dueDate) return false;
        const noteDate = note.dueDate.toDate ? note.dueDate.toDate() : new Date(note.dueDate);
        return isBefore(noteDate, addDays(new Date(), 7)) && !note.isArchived && baseFilter;
      }
      
      return !note.isArchived && baseFilter && matchesFolder;
    });
  }, [notes, searchQuery, currentFolderId, selectedTags, viewMode, statusFilter, searchEverywhere]);

  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      if (userSettings.sortBy === 'status') {
        const statusA = statuses.findIndex(s => s.id === a.status);
        const statusB = statuses.findIndex(s => s.id === b.status);
        if (statusA !== statusB) return statusA - statusB;
      }
      
      const dateA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
      const dateB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [filteredNotes, userSettings.sortBy, statuses]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(n => n.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [notes]);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'direction': 'rtl' }, { 'align': [] }],
      ['link', 'image', 'video'],
      ['clean'],
      ['table']
    ],
  };

  const handlePopout = (noteId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?popout=${noteId}`;
    const width = 450;
    const height = 550;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    window.open(
      url, 
      `popout-${noteId}`, 
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
    );
  };

  if (!isAuthReady) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
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
          <div className="w-20 h-20 bg-purple-100 text-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Folder size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Notes For Myself</h1>
          <p className="text-gray-500 mb-10 font-medium">Admin Login Required</p>
          
          {authError && (
            <div className="bg-purple-50 text-purple-600 p-4 rounded-2xl text-sm font-medium mb-8 border border-purple-100">
              {authError}
            </div>
          )}
          
          <input 
            type="password" 
            value={loginPassword} 
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Enter Admin Password" 
            className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl mb-6 text-center focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-lg font-bold tracking-widest"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          
          <button 
            onClick={handleLogin}
            className="w-full bg-purple-500 text-white py-5 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all active:translate-y-0"
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

  const urlParams = new URLSearchParams(window.location.search);
  const popoutNoteId = urlParams.get('popout');

  if (popoutNoteId) {
    const note = notes.find(n => n.id === popoutNoteId);
    if (note) {
      return <PopoutView note={note} userSettings={userSettings} statuses={statuses} />;
    }
  }

  const currentFolder = folders.find(f => f.id === currentFolderId);
  const boardBackground = currentFolder?.wallpaper || userSettings.boardTheme || '';

  return (
    <div 
      className={`min-h-screen flex flex-col transition-all duration-500 ${userSettings.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-base text-gray-900'}`} 
      style={{ 
        background: boardBackground.startsWith('http') ? `url(${boardBackground})` : boardBackground,
        backgroundColor: userSettings.theme === 'dark' ? '#111827' : '#F0F8FF',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <header className={`backdrop-blur-xl border-b sticky top-0 z-[50] px-4 md:px-12 py-4 md:py-6 ${userSettings.theme === 'dark' ? 'glass-dark' : 'glass'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-purple-50 rounded-full transition-colors md:hidden"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setViewMode('board'); setCurrentFolderId(null); }}>
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
                <PlusCircle size={24} />
              </div>
              <h1 className="text-xl font-bold tracking-tight hidden sm:block truncate text-gray-800">Notes For Myself</h1>
            </div>

            {/* Mobile Search Toggle */}
            <div className="flex items-center gap-2 md:hidden">
              <button 
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className={`p-2 rounded-xl transition-all ${showMobileSearch ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}
              >
                <Search size={22} />
              </button>
            </div>

            <div className="hidden md:flex items-center gap-1 ml-2 border-l pl-4 border-gray-100">
              <button 
                onClick={handleUndo}
                disabled={historyIndex < 0}
                className={`p-2 rounded-xl transition-all ${historyIndex < 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-purple-50 hover:text-purple-500'}`}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={20} />
              </button>
              <button 
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className={`p-2 rounded-xl transition-all ${historyIndex >= history.length - 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-purple-50 hover:text-purple-500'}`}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 size={20} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className={`hidden md:flex relative items-center border rounded-full py-2 px-4 shadow-sm hover:shadow-md transition-shadow max-w-md w-full mx-4 ${userSettings.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-secondary/50'}`}>
            <Search size={18} className="text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search notes, tags..."
              className="bg-transparent border-none focus:outline-none w-full text-sm font-medium placeholder:text-gray-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="h-6 w-px bg-gray-100 mx-2" />
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`p-2 rounded-full transition-colors relative ${showFilterDropdown ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
            >
              <Filter size={14} />
              {statusFilter !== 'all' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 border-2 border-white rounded-full" />
              )}
            </button>

            {showFilterDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)} />
                <motion.div 
                  initial={isMobile() ? { opacity: 0, scale: 0.9, x: '-50%', y: '-40%' } : { opacity: 0, y: 10, scale: 0.95 }}
                  animate={isMobile() ? { opacity: 1, scale: 1, x: '-50%', y: '-50%' } : { opacity: 1, y: 0, scale: 1 }}
                  exit={isMobile() ? { opacity: 0, scale: 0.9, x: '-50%', y: '-40%' } : { opacity: 0, y: 10, scale: 0.95 }}
                  className={`${isMobile() ? 'fixed top-1/2 left-1/2 w-[92%] max-w-sm rounded-[2.5rem] p-8 max-h-[80vh] overflow-y-auto' : 'absolute top-full right-0 mt-2 p-6 rounded-3xl w-80 shadow-2xl'} bg-white/95 backdrop-blur-md border border-purple-50 z-50`}
                >
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Search</h4>
                        <button 
                          onClick={() => setSearchEverywhere(!searchEverywhere)}
                          className={`w-10 h-5 rounded-full transition-all relative ${searchEverywhere ? 'bg-purple-500' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${searchEverywhere ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">View Mode</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => { setViewMode('board'); setShowFilterDropdown(false); }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${viewMode === 'board' ? 'bg-purple-500 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                        >
                          <Grid size={14} /> Board
                        </button>
                        <button 
                          onClick={() => { setViewMode('favorites'); setShowFilterDropdown(false); }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${viewMode === 'favorites' ? 'bg-purple-500 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                        >
                          <Star size={14} /> Favorites
                        </button>
                        <button 
                          onClick={() => { setViewMode('due'); setShowFilterDropdown(false); }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${viewMode === 'due' ? 'bg-purple-500 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                        >
                          <Clock size={14} /> Upcoming
                        </button>
                        <button 
                          onClick={() => { setViewMode('archive'); setShowFilterDropdown(false); }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${viewMode === 'archive' ? 'bg-purple-500 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                        >
                          <Archive size={14} /> Archive
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Filter by Status</h4>
                      <div className="space-y-1">
                        <button 
                          onClick={() => { setStatusFilter('all'); setShowFilterDropdown(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-between transition-colors ${statusFilter === 'all' ? 'bg-purple-50 text-purple-600' : 'hover:bg-gray-50 text-gray-700'}`}
                        >
                          <span>All Statuses</span>
                          {statusFilter === 'all' && <CheckCircle2 size={14} />}
                        </button>
                        {statuses.filter(s => s.isVisible).map((s) => (
                          <button 
                            key={s.id}
                            onClick={() => { setStatusFilter(s.id); setShowFilterDropdown(false); }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-between transition-colors ${statusFilter === s.id ? 'bg-purple-50 text-purple-600' : 'hover:bg-gray-50 text-gray-700'}`}
                          >
                            <span>{s.label}</span>
                            {statusFilter === s.id && <CheckCircle2 size={14} />}
                          </button>
                        ))}
                      </div>
                    </div>
                    {isMobile() && (
                      <button 
                        onClick={() => setShowFilterDropdown(false)}
                        className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold active:scale-95 transition-transform"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentFolderId && isAdmin && (
              <div className="relative">
                <button 
                  onClick={() => setShowBgPopover(!showBgPopover)}
                  className={`p-2 rounded-full transition-colors ${showBgPopover ? 'bg-purple-100 text-purple-600' : 'hover:bg-purple-50 text-gray-400 hover:text-purple-500'}`}
                  title="Board Background"
                >
                  <Palette size={20} />
                </button>
                <AnimatePresence>
                  {showBgPopover && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowBgPopover(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 p-3 bg-white rounded-2xl shadow-2xl border border-purple-50 grid grid-cols-4 gap-2 z-50 w-48"
                      >
                        {['#F9F7FF', '#FFF7F7', '#F7FFF7', '#F7F7FF', '#FFFBF0', '#F0FBFF', '#FBF0FF', '#FFFFFF'].map(bg => (
                          <button
                            key={bg}
                            onClick={() => {
                              updateFolderBackground(currentFolderId, bg);
                              setShowBgPopover(false);
                            }}
                            className="w-8 h-8 rounded-lg border border-gray-100 hover:scale-110 transition-transform"
                            style={{ backgroundColor: bg }}
                          />
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-full border border-gray-100 hidden sm:flex">
              <button 
                onClick={() => handleToggleAllCollapse(true)}
                className="p-1.5 hover:bg-primary/10 rounded-full text-gray-400 hover:text-primary transition-colors"
                title="Collapse All"
              >
                <Minimize2 size={16} />
              </button>
              <button 
                onClick={() => handleToggleAllCollapse(false)}
                className="p-1.5 hover:bg-primary/10 rounded-full text-gray-400 hover:text-primary transition-colors"
                title="Expand All"
              >
                <Maximize2 size={16} />
              </button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button 
                onClick={() => updateUserSettings({ gridColumns: 1 })}
                className={`p-1.5 rounded-full transition-all ${userSettings.gridColumns === 1 ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                title="List View"
              >
                <List size={16} />
              </button>
              <button 
                onClick={() => updateUserSettings({ gridColumns: 3 })}
                className={`p-1.5 rounded-full transition-all ${userSettings.gridColumns > 1 ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                title="Grid View"
              >
                <Grid size={16} />
              </button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <div className="relative">
                <button 
                  onClick={() => setShowDensityPopover(!showDensityPopover)}
                  className={`p-1.5 rounded-full transition-colors flex items-center gap-1.5 border ${showDensityPopover ? 'bg-purple-100 border-purple-200 text-purple-600' : 'bg-white/50 border-transparent text-gray-400 hover:text-purple-500 hover:border-purple-100'}`}
                  title="Grid Density"
                >
                  <div className="flex items-end gap-0.5 h-3">
                    {[1, 2, 3, 4].map(i => (
                      <div 
                        key={i} 
                        className={`w-0.5 rounded-full transition-all ${userSettings.gridColumns >= (7-i*1.5) ? 'bg-purple-500' : 'bg-gray-300'}`} 
                        style={{ height: `${25 + i * 25}%` }} 
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-gray-500">{userSettings.gridColumns}</span>
                </button>
                <AnimatePresence>
                  {showDensityPopover && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowDensityPopover(false)} />
                      <motion.div 
                        initial={isMobile() ? { opacity: 0, scale: 0.9, x: '-50%', y: '-40%' } : { opacity: 0, y: 10, scale: 0.95 }}
                        animate={isMobile() ? { opacity: 1, scale: 1, x: '-50%', y: '-50%' } : { opacity: 1, y: 0, scale: 1 }}
                        exit={isMobile() ? { opacity: 0, scale: 0.9, x: '-50%', y: '-40%' } : { opacity: 0, y: 10, scale: 0.95 }}
                        className={`${isMobile() ? 'fixed top-1/2 left-1/2 w-[92%] max-w-sm rounded-[2.5rem] p-8' : 'absolute top-full right-0 mt-2 p-4 rounded-3xl min-w-[220px]'} bg-white/95 backdrop-blur-md shadow-2xl border border-purple-50 z-50`}
                      >
                        <div className="flex items-center justify-between mb-6 px-1">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Grid Density</span>
                          <span className="text-xs font-bold text-purple-500 bg-purple-50 px-4 py-1.5 rounded-full">{userSettings.gridColumns} Columns</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[1, 2, 3, 4, 5, 6].map(cols => (
                            <button 
                              key={cols}
                              onClick={() => {
                                updateUserSettings({ gridColumns: cols });
                                setShowDensityPopover(false);
                              }}
                              className={`h-14 flex items-center justify-center rounded-2xl text-base font-bold transition-all ${userSettings.gridColumns === cols ? 'bg-purple-500 text-white shadow-lg shadow-purple-200 scale-105' : 'text-gray-400 hover:bg-purple-50 hover:text-purple-500'}`}
                            >
                              {cols}
                            </button>
                          ))}
                        </div>
                        {isMobile() && (
                          <button 
                            onClick={() => setShowDensityPopover(false)}
                            className="w-full mt-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold active:scale-95 transition-transform"
                          >
                            Close
                          </button>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button 
                onClick={() => {
                  // Auto-arrange logic: Sort by pinned, then status, then date
                  // This is a visual sort, we can update the userSettings to reflect a sort preference
                  updateUserSettings({ sortBy: userSettings.sortBy === 'status' ? 'date' : 'status' });
                }}
                className={`p-1.5 rounded-full transition-all ${userSettings.sortBy === 'status' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Sort by Status/Date"
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => updateUserSettings({ cardViewMode: userSettings.cardViewMode === 'compact' ? 'full' : 'compact' })}
                className={`p-1.5 rounded-full transition-all ${userSettings.cardViewMode === 'compact' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Toggle View Mode"
              >
                <Type size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsTaskSidebarOpen(!isTaskSidebarOpen)}
                className={`p-2 rounded-full transition-colors hidden sm:flex ${isTaskSidebarOpen ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-gray-600'}`}
                title="Tasks"
              >
                <CheckSquare size={20} />
              </button>
              <button 
                onClick={() => { setEditNoteData(null); resetNoteForm(); setIsQuickNote(false); setShowAddNoteModal(true); }}
                className="bg-primary text-white p-2 sm:px-4 sm:py-2 rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all flex items-center gap-2 group hidden sm:flex"
                title="New Note"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
                <span className="hidden md:inline">New Note</span>
              </button>
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-2 hover:bg-primary/10 rounded-full text-gray-600 transition-colors hidden sm:flex"
                title="Settings"
              >
                <Settings size={20} />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-purple-50 rounded-full text-gray-600 transition-colors hidden sm:flex"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
              {isMobile() && (
                <button 
                  onClick={() => setShowSettingsModal(true)}
                  className="p-2 text-gray-600"
                >
                  <Settings size={24} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {isMobile() && showMobileSearch && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-b border-purple-100 z-[49] shadow-xl"
          >
            <div className="relative flex items-center bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3">
              <Search size={18} className="text-gray-400 mr-3" />
              <input 
                autoFocus
                type="text" 
                placeholder="Search notes, tags..."
                className="bg-transparent border-none focus:outline-none w-full text-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex w-full">
        {/* Sidebar - Desktop */}
        <aside className={`hidden md:block transition-all duration-300 sticky top-20 h-[calc(100vh-80px)] overflow-y-auto border-r ${userSettings.theme === 'dark' ? 'glass-dark' : 'glass'} ${userSettings.isSidebarCollapsed ? 'w-20' : 'w-64'} p-4`}>
          <div className="flex justify-end mb-4">
            <button 
              onClick={() => setUserSettings(prev => ({ ...prev, isSidebarCollapsed: !prev.isSidebarCollapsed }))}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
            >
              <ChevronLeft size={18} className={`transition-transform duration-300 ${userSettings.isSidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <nav className="space-y-6">
            <div>
              {!userSettings.isSidebarCollapsed && <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">Navigation</h3>}
              <ul className="space-y-1">
                <li>
                  <button 
                    onClick={() => { setViewMode('board'); setCurrentFolderId(null); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative group/tooltip ${viewMode === 'board' && !currentFolderId ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-white/50 text-gray-700'} ${userSettings.isSidebarCollapsed ? 'justify-center' : ''}`}
                  >
                    <Grid size={18} /> {!userSettings.isSidebarCollapsed && 'All Notes'}
                    {userSettings.isSidebarCollapsed && (
                      <div className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-all shadow-lg translate-x-2 group-hover/tooltip:translate-x-0">
                        All Notes
                      </div>
                    )}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setViewMode('workflow')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative group/tooltip ${viewMode === 'workflow' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-white/50 text-gray-700'} ${userSettings.isSidebarCollapsed ? 'justify-center' : ''}`}
                  >
                    <Layout size={18} /> {!userSettings.isSidebarCollapsed && 'Workflow Board'}
                    {userSettings.isSidebarCollapsed && (
                      <div className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-all shadow-lg translate-x-2 group-hover/tooltip:translate-x-0">
                        Workflow Board
                      </div>
                    )}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setViewMode('favorites')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative group/tooltip ${viewMode === 'favorites' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-white/50 text-gray-700'} ${userSettings.isSidebarCollapsed ? 'justify-center' : ''}`}
                  >
                    <Star size={18} /> {!userSettings.isSidebarCollapsed && 'Favorites'}
                    {userSettings.isSidebarCollapsed && (
                      <div className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-all shadow-lg translate-x-2 group-hover/tooltip:translate-x-0">
                        Favorites
                      </div>
                    )}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setViewMode('due')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative group/tooltip ${viewMode === 'due' ? 'bg-purple-50 text-purple-600' : 'hover:bg-gray-100 text-gray-700'} ${userSettings.isSidebarCollapsed ? 'justify-center' : ''}`}
                  >
                    <Clock size={18} /> {!userSettings.isSidebarCollapsed && 'Upcoming'}
                    {userSettings.isSidebarCollapsed && (
                      <div className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-all shadow-lg translate-x-2 group-hover/tooltip:translate-x-0">
                        Upcoming
                      </div>
                    )}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setViewMode('archive')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative group/tooltip ${viewMode === 'archive' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-white/50 text-gray-700'} ${userSettings.isSidebarCollapsed ? 'justify-center' : ''}`}
                  >
                    <Archive size={18} /> {!userSettings.isSidebarCollapsed && 'Archive'}
                    {userSettings.isSidebarCollapsed && (
                      <div className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-all shadow-lg translate-x-2 group-hover/tooltip:translate-x-0">
                        Archive
                      </div>
                    )}
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className={`flex items-center justify-between mb-4 px-2 ${userSettings.isSidebarCollapsed ? 'justify-center' : ''}`}>
                {!userSettings.isSidebarCollapsed && <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Folders</h3>}
                {isAdmin && !userSettings.isSidebarCollapsed && (
                  <button 
                    onClick={() => { setEditFolderData(null); setShowAddFolderModal(true); }} 
                    className="text-primary hover:bg-primary/10 p-1 rounded transition-colors"
                    title="New Folder"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
              <ul className="space-y-1">
                {folders.filter(f => !f.parentId).map(folder => (
                  <li key={folder.id} className="group/folder relative">
                    <button 
                      onClick={() => { setCurrentFolderId(folder.id); setViewMode('board'); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative group/tooltip ${currentFolderId === folder.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-white/50 text-gray-700'} ${userSettings.isSidebarCollapsed ? 'justify-center' : ''}`}
                    >
                      <Folder size={18} /> {!userSettings.isSidebarCollapsed && folder.name}
                      {userSettings.isSidebarCollapsed && (
                        <div className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-all shadow-lg translate-x-2 group-hover/tooltip:translate-x-0">
                          {folder.name}
                        </div>
                      )}
                    </button>
                    {isAdmin && !userSettings.isSidebarCollapsed && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-purple-500 opacity-0 group-hover/folder:opacity-100 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
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
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${selectedTags.includes(tag) ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main 
          className="flex-1 p-6 md:p-12 relative max-w-screen-2xl mx-auto w-full"
          onContextMenu={(e) => {
            if (isAdmin) {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, type: 'board' });
            }
          }}
          onClick={() => setContextMenu(null)}
        >
          <div className="mb-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Sparkles size={20} />
                  </div>
                  <span className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Workspace</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 tracking-tight">
                  {viewMode === 'board' ? (currentFolderId ? folders.find(f => f.id === currentFolderId)?.name : 'My Notes') : 
                   viewMode === 'archive' ? 'Archive' : 
                   viewMode === 'favorites' ? 'Favorites' : 
                   viewMode === 'workflow' ? 'Workflow Board' : 'Upcoming Due Dates'}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-gray-500 font-bold text-xs flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    {filteredNotes.length} active notes
                  </p>
                  <div className="w-px h-3 bg-gray-200" />
                  <p className="text-gray-400 text-xs font-bold">{format(new Date(), 'EEEE, MMMM do')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-white/50 shadow-sm">
                  {selectedTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-xl text-[10px] font-bold border border-primary/10">
                      #{tag} <X size={12} className="cursor-pointer hover:scale-110 transition-transform" onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))} />
                    </span>
                  ))}
                  {selectedTags.length > 0 && (
                    <button onClick={() => setSelectedTags([])} className="px-2 text-[10px] text-gray-400 font-bold hover:text-primary transition-colors">Clear</button>
                  )}
                  {selectedTags.length === 0 && (
                    <span className="px-3 py-1 text-[10px] text-gray-400 font-bold italic">No tags selected</span>
                  )}
                </div>
                <button 
                  onClick={() => { setEditNoteData(null); resetNoteForm(); setIsQuickNote(false); setShowAddNoteModal(true); }}
                  className="hidden md:flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all active:translate-y-0"
                >
                  <Plus size={18} />
                  <span>New Note</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Notes Grid or Workflow Board */}
          {viewMode === 'workflow' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-start">
              {statuses.filter(s => s.isVisible).map((status) => (
                <div key={status.id} className="bg-gray-100/50 rounded-3xl p-3 min-h-[600px] flex flex-col gap-3">
                  <div className="flex items-center justify-between px-2 mb-1">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-gray-500 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                      {status.label}
                    </h3>
                    <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-400 shadow-sm">
                      {filteredNotes.filter(n => n.status === status.id).length}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {sortedNotes.filter(n => n.status === status.id).slice(0, userSettings.notesPerColumn).map((note) => (
                      <NoteCard 
                        key={note.id} 
                        note={note} 
                        isAdmin={isAdmin} 
                        userSettings={userSettings}
                        onEdit={() => {
                          setEditNoteData(note);
                          setNoteTitle(note.title);
                          setEditorContent(note.content);
                          setNoteFolderId(note.folderId);
                          setNoteTags(note.tags);
                          setNoteDueDate(note.dueDate ? format(note.dueDate.toDate ? note.dueDate.toDate() : new Date(note.dueDate), 'yyyy-MM-dd') : '');
                          setNoteImageUrl(note.imageUrl || '');
                          setNoteStatus(note.status || statuses[0]?.id || 'todo');
                          setNoteColor(note.color || '');
                          setShowAddNoteModal(true);
                        }}
                        onFavorite={() => toggleFavorite(note)}
                        onArchive={() => toggleArchive(note)}
                        onDelete={() => deleteNote(note.id)}
                        onStatusChange={(s) => updateNoteStatus(note.id, s)}
                        onColorChange={(c) => updateNoteColor(note.id, c)}
                        onPin={() => handlePinNote(note.id, !note.isPinned)}
                        onSizeChange={(s) => handleSizeNote(note.id, s)}
                        onToggleCollapse={() => handleToggleCollapse(note.id, !note.isCollapsed)}
                        onPopout={() => handlePopout(note.id)}
                        onContextMenu={(x, y, noteId) => setContextMenu({ x, y, type: 'note', noteId })}
                        statuses={statuses}
                        viewMode={userSettings.cardViewMode}
                        onClick={() => openWindow(note.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className="grid gap-3 auto-rows-min grid-flow-dense"
              style={{ 
                gridTemplateColumns: `repeat(${isMobile() ? 1 : userSettings.gridColumns}, minmax(0, 1fr))` 
              }}
            >
              <AnimatePresence mode="popLayout">
                {sortedNotes.map((note) => (
                  <NoteCard 
                    key={note.id} 
                    note={note} 
                    isAdmin={isAdmin} 
                    userSettings={userSettings}
                    onEdit={() => {
                      setEditNoteData(note);
                      setNoteTitle(note.title);
                      setEditorContent(note.content);
                      setNoteFolderId(note.folderId);
                      setNoteTags(note.tags);
                      setNoteDueDate(note.dueDate ? format(note.dueDate.toDate ? note.dueDate.toDate() : new Date(note.dueDate), 'yyyy-MM-dd') : '');
                      setNoteImageUrl(note.imageUrl || '');
                      setNoteStatus(note.status || statuses[0]?.id || 'todo');
                      setNoteColor(note.color || '');
                      setShowAddNoteModal(true);
                    }}
                    onFavorite={() => toggleFavorite(note)}
                    onArchive={() => toggleArchive(note)}
                    onDelete={() => deleteNote(note.id)}
                    onStatusChange={(s) => updateNoteStatus(note.id, s)}
                    onColorChange={(c) => updateNoteColor(note.id, c)}
                    onPin={() => handlePinNote(note.id, !note.isPinned)}
                    onSizeChange={(s) => handleSizeNote(note.id, s)}
                    onToggleCollapse={() => handleToggleCollapse(note.id, !note.isCollapsed)}
                    onPopout={() => handlePopout(note.id)}
                    onContextMenu={(x, y, noteId) => setContextMenu({ x, y, type: 'note', noteId })}
                    statuses={statuses}
                    viewMode={userSettings.cardViewMode}
                    onClick={() => openWindow(note.id)}
                  />
                ))}
              </AnimatePresence>
              {sortedNotes.length === 0 && (
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

        <TaskSidebar 
          isOpen={isTaskSidebarOpen}
          onClose={() => setIsTaskSidebarOpen(false)}
          isPinned={isTaskSidebarPinned}
          onTogglePin={() => setIsTaskSidebarPinned(!isTaskSidebarPinned)}
          tasks={tasks}
          taskLists={taskLists}
          activeListId={activeTaskListId}
          onSelectList={setActiveTaskListId}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onAddList={handleAddTaskList}
          onFavoriteList={handleFavoriteTaskList}
          onDeleteList={handleDeleteTaskList}
          onPinTask={handlePinTask}
          onUpdateTask={handleUpdateTask}
          onUpdateList={handleUpdateTaskList}
          onMoveTask={handleMoveTask}
          notes={notes}
          onOpenNote={(noteId) => openWindow(noteId)}
        />
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
              className="relative bg-white w-[85%] max-w-[320px] h-full shadow-2xl flex flex-col"
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
                      {isAdmin && (
                        <button 
                          onClick={() => { setShowAddFolderModal(true); setIsSidebarOpen(false); }} 
                          className="text-purple-500 hover:bg-purple-50 p-1 rounded transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      )}
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

      {/* Mobile Floating Action Button */}
      {isMobile() && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => { setEditNoteData(null); resetNoteForm(); setIsQuickNote(false); setShowAddNoteModal(true); }}
          className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-white rounded-[1.5rem] shadow-2xl z-[60] flex items-center justify-center border-4 border-white/20 backdrop-blur-sm"
        >
          <Plus size={32} />
        </motion.button>
      )}

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
              className={`relative ${userSettings.theme === 'dark' ? 'glass-dark' : 'glass'} w-[92%] ${isQuickNote ? 'max-w-xl' : 'max-w-5xl'} rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[80vh] md:h-auto md:max-h-[90vh] border border-white/20`}
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div>
                  <h2 className="text-3xl font-display font-bold text-gray-900">{editNoteData ? 'Edit Note' : (isQuickNote ? 'Quick Note' : 'Create New Note')}</h2>
                  <p className="text-gray-500 text-sm mt-1">Capture your thoughts and organize them beautifully.</p>
                </div>
                <button onClick={() => setShowAddNoteModal(false)} className="p-3 hover:bg-black/5 rounded-2xl transition-all active:scale-90">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-8">
                {isQuickNote ? (
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="Title..."
                      className="w-full p-5 bg-white/50 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold text-2xl"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                    />
                    <div 
                      ref={quillWrapperRef}
                      className="min-h-[400px] border border-gray-200 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm shadow-inner"
                    >
                      <ReactQuill 
                        theme="snow" 
                        value={editorContent} 
                        onChange={setEditorContent}
                        modules={{ toolbar: [['bold', 'italic', 'underline'], ['link', 'image'], ['clean']] }}
                        className="h-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Title</label>
                        <input 
                          type="text" 
                          placeholder="Enter note title..."
                          className="w-full p-5 bg-white/50 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold text-xl"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Folder</label>
                          <select 
                            className="w-full p-5 bg-white/50 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-primary focus:outline-none transition-all text-sm font-bold"
                            value={noteFolderId || ''}
                            onChange={(e) => setNoteFolderId(e.target.value || null)}
                          >
                            <option value="">No Folder</option>
                            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Status</label>
                          <select 
                            className="w-full p-5 bg-white/50 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-primary focus:outline-none transition-all text-sm font-bold"
                            value={noteStatus}
                            onChange={(e) => setNoteStatus(e.target.value)}
                          >
                            {statuses.filter(s => s.isVisible).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Note Color</label>
                        <div className="flex flex-wrap gap-2">
                          {PASTEL_COLORS.map(c => (
                            <button
                              key={c.value}
                              onClick={() => setNoteColor(c.value)}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${noteColor === c.value ? 'border-purple-500 scale-110 shadow-md' : 'border-white shadow-sm hover:scale-105'}`}
                              style={{ backgroundColor: c.value || '#FFFFFF' }}
                              title={c.name}
                            />
                          ))}
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
                          <button 
                            onClick={async () => {
                              try {
                                const clipboardItems = await navigator.clipboard.read();
                                for (const item of clipboardItems) {
                                  for (const type of item.types) {
                                    if (type.startsWith('image/')) {
                                      const blob = await item.getType(type);
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        const base64 = event.target?.result as string;
                                        setEditorContent(prev => prev + `<p><img src="${base64}" /></p>`);
                                      };
                                      reader.readAsDataURL(blob);
                                    }
                                  }
                                }
                              } catch (err) {
                                console.error("Clipboard access failed:", err);
                                alert("Please use Ctrl+V (or Cmd+V) to paste images directly into the editor.");
                              }
                            }}
                            className="p-4 bg-gray-100 rounded-2xl text-gray-500 hover:bg-gray-200 transition-colors"
                            title="Paste image from clipboard"
                          >
                            <ImageIcon size={20} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Alignment</label>
                        <div className="flex gap-2">
                          {(['left', 'center', 'right', 'justify'] as const).map(align => (
                            <button
                              key={align}
                              onClick={() => setNoteAlignment(align)}
                              className={`flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center ${noteAlignment === align ? 'border-purple-500 bg-purple-50 text-purple-500' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                            >
                              {align === 'left' && <AlignLeft size={18} />}
                              {align === 'center' && <AlignCenter size={18} />}
                              {align === 'right' && <AlignRight size={18} />}
                              {align === 'justify' && <AlignJustify size={18} />}
                            </button>
                          ))}
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
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Content</label>
                      <div 
                        ref={quillWrapperRef}
                        className="flex-1 min-h-[300px] border border-gray-200 rounded-2xl overflow-hidden bg-white"
                        dir={!noteAlignment ? "auto" : (noteAlignment === 'right' ? 'rtl' : (noteAlignment === 'left' ? 'ltr' : 'auto'))}
                        style={{ textAlign: noteAlignment || 'start' }}
                      >
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
                )}
              </div>

              <div className="p-8 border-t border-white/10 flex justify-end gap-4 bg-white/5">
                <button 
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-8 py-4 bg-white/50 border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-white/80 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddNote}
                  className="px-10 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all active:translate-y-0"
                >
                  {editNoteData ? 'Update Note' : 'Save Note'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showAddFolderModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-8">
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
              className={`relative ${userSettings.theme === 'dark' ? 'glass-dark' : 'glass'} w-[92%] max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white/20`}
            >
              <h2 className="text-2xl font-bold mb-6">{editFolderData ? 'Edit Folder' : 'New Folder'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Folder Name</label>
                  <input 
                    type="text" 
                    id="folderName"
                    placeholder="Enter folder name..."
                    className="w-full p-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold"
                    defaultValue={editFolderData?.name}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Parent Folder (Optional)</label>
                  <select 
                    id="folderParent"
                    className="w-full p-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary focus:outline-none transition-all text-sm font-medium"
                    defaultValue={editFolderData?.parentId || ''}
                  >
                    <option value="">Root</option>
                    {folders.filter(f => f.id !== editFolderData?.id).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Folder Wallpaper (URL or Gradient)</label>
                  <input 
                    type="text" 
                    id="folderWallpaper"
                    placeholder="linear-gradient(to right, #ff7e5f, #feb47b) or image URL"
                    className="w-full p-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold"
                    defaultValue={editFolderData?.wallpaper}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => {
                    const name = (document.getElementById('folderName') as HTMLInputElement).value;
                    const parentId = (document.getElementById('folderParent') as HTMLSelectElement).value || null;
                    const wallpaper = (document.getElementById('folderWallpaper') as HTMLInputElement).value || '';
                    handleAddFolder(name, parentId, wallpaper);
                  }}
                  className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                >
                  Save Folder
                </button>
                <button 
                  onClick={() => setShowAddFolderModal(false)}
                  className="flex-1 bg-white/50 text-gray-600 py-4 rounded-2xl font-bold hover:bg-white/80 transition-all border border-gray-200"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <SettingsModal 
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          statuses={statuses}
          setStatuses={setStatuses}
          userSettings={userSettings}
          setUserSettings={setUserSettings}
          folders={folders}
          taskLists={taskLists}
          requestNotificationPermission={requestNotificationPermission}
          onSave={async (newStatuses, newSettings) => {
            const sDoc = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global');
            try {
              await setDoc(sDoc, { statuses: newStatuses, userSettings: newSettings }, { merge: true });
              setStatuses(newStatuses);
              setUserSettings(newSettings);
              setShowSettingsModal(false);
            } catch (err) {
              console.error("Error saving settings:", err);
            }
          }}
        />

        {/* Floating Windows */}
        <AnimatePresence>
          {activeWindows.map(win => {
            const note = notes.find(n => n.id === win.noteId);
            if (!note) return null;
            return (
              <FloatingWindow
                key={win.id}
                window={win}
                note={note}
                notes={notes}
                onClose={() => closeWindow(win.id)}
                onMinimize={() => toggleMinimizeWindow(win.id)}
                onMaximize={() => toggleMaximizeWindow(win.id)}
                onFocus={() => focusWindow(win.id)}
                onResize={(w, h) => updateWindowSize(win.id, w, h)}
                onDrag={(x, y) => updateWindowPos(win.id, x, y)}
                isAdmin={isAdmin}
                openWindow={openWindow}
                onEdit={() => {
                  setEditNoteData(note);
                  setNoteTitle(note.title);
                  setEditorContent(note.content);
                  setNoteFolderId(note.folderId);
                  setNoteTags(note.tags);
                  setNoteDueDate(note.dueDate ? format(note.dueDate.toDate ? note.dueDate.toDate() : new Date(note.dueDate), 'yyyy-MM-dd') : '');
                  setNoteImageUrl(note.imageUrl || '');
                  setNoteStatus(note.status || statuses[0]?.id || 'todo');
                  setNoteColor(note.color || '');
                  setShowAddNoteModal(true);
                }}
                onFavorite={() => toggleFavorite(note)}
                onArchive={() => toggleArchive(note)}
                onDelete={() => deleteNote(note.id)}
                onStatusChange={(status) => updateNoteStatus(note.id, status)}
                onColorChange={(color) => updateNoteColor(note.id, color)}
                onUpdateNote={handleUpdateNote}
                onContextMenu={(x, y, noteId) => setContextMenu({ x, y, type: 'note', noteId })}
                onPopout={() => handlePopout(note.id)}
                statuses={statuses}
                userSettings={userSettings}
              />
            );
          })}
        </AnimatePresence>

        {/* Taskbar for Minimized Windows */}
        {activeWindows.some(w => w.isMinimized) && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-[400] bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-white/50 hidden md:flex">
            {activeWindows.filter(w => w.isMinimized).map(win => {
              const note = notes.find(n => n.id === win.noteId);
              return (
                <button
                  key={win.id}
                  onClick={() => toggleMinimizeWindow(win.id)}
                  className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-bold hover:bg-purple-100 transition-all flex items-center gap-2"
                >
                  <ExternalLink size={14} /> {note?.title || 'Note'}
                </button>
              );
            })}
          </div>
        )}
      </AnimatePresence>

        {/* Mobile Navigation Bar */}
        {isMobile() && (
          <div className={`fixed bottom-0 left-0 right-0 ${userSettings.theme === 'dark' ? 'bg-gray-900/80 border-gray-800' : 'bg-white/80 border-gray-100'} backdrop-blur-xl border-t px-6 py-3 flex items-center justify-between z-[100] safe-area-bottom`}>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-3 rounded-2xl transition-all ${isSidebarOpen ? 'bg-primary text-white shadow-lg' : 'text-gray-400'}`}
            >
              <Menu size={24} />
            </button>
            <button 
              onClick={() => setIsTaskSidebarOpen(!isTaskSidebarOpen)}
              className={`p-3 rounded-2xl transition-all ${isTaskSidebarOpen ? 'bg-primary text-white shadow-lg' : 'text-gray-400'}`}
            >
              <CheckSquare size={24} />
            </button>
            <button 
              onClick={() => { setEditNoteData(null); resetNoteForm(); setIsQuickNote(false); setShowAddNoteModal(true); }}
              className={`bg-primary text-white p-4 rounded-full shadow-xl shadow-primary/30 -mt-8 border-4 ${userSettings.theme === 'dark' ? 'border-gray-900' : 'border-white'} active:scale-90 transition-transform`}
            >
              <Plus size={28} />
            </button>
            <button 
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className={`p-3 rounded-2xl transition-all ${showMobileSearch ? 'bg-primary text-white shadow-lg' : 'text-gray-400'}`}
            >
              <Search size={24} />
            </button>
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="p-3 text-gray-400"
            >
              <Settings size={24} />
            </button>
          </div>
        )}

        {/* Global Context Menu */}
        <AnimatePresence>
          {contextMenu && (
            <>
              <div className="fixed inset-0 z-[500]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                style={{ 
                  left: Math.min(contextMenu.x, window.innerWidth - 260), 
                  top: Math.min(contextMenu.y, window.innerHeight - 400) 
                }}
                className="fixed z-[501] w-64 bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white p-2 overflow-hidden"
              >
                {contextMenu.type === 'board' ? (
                  <div className="space-y-1">
                    <div className="p-3 border-b border-gray-50 mb-1">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Board Actions</h4>
                    </div>
                    <button 
                      onClick={() => {
                        setEditNoteData(null);
                        resetNoteForm();
                        if (currentFolderId) setNoteFolderId(currentFolderId);
                        setIsQuickNote(true);
                        setShowAddNoteModal(true);
                        setContextMenu(null);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-purple-50 hover:text-purple-600 text-sm font-bold flex items-center gap-3 transition-all rounded-2xl"
                    >
                      <PlusCircle size={18} /> Add Quick Note
                    </button>
                    <button 
                      onClick={() => {
                        setShowAddFolderModal(true);
                        setContextMenu(null);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-purple-50 hover:text-purple-600 text-sm font-bold flex items-center gap-3 transition-all rounded-2xl"
                    >
                      <Folder size={18} /> New Folder
                    </button>
                    <button 
                      onClick={() => {
                        handleUndo();
                        setContextMenu(null);
                      }}
                      disabled={historyIndex < 0}
                      className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-3 transition-all rounded-2xl ${historyIndex < 0 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-purple-50 hover:text-purple-600 text-gray-700'}`}
                    >
                      <Undo2 size={18} /> Undo Action
                    </button>
                    <button 
                      onClick={() => {
                        handleRedo();
                        setContextMenu(null);
                      }}
                      disabled={historyIndex >= history.length - 1}
                      className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-3 transition-all rounded-2xl ${historyIndex >= history.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-purple-50 hover:text-purple-600 text-gray-700'}`}
                    >
                      <Redo2 size={18} /> Redo Action
                    </button>
                    <div className="h-px bg-gray-100 my-1 mx-2" />
                    <button 
                      onClick={() => {
                        setViewMode('board');
                        setContextMenu(null);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium flex items-center gap-3 transition-all rounded-2xl"
                    >
                      <Grid size={18} /> All Notes
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="p-3 border-b border-gray-50 mb-1">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Note Customization</h4>
                    </div>
                    
                    <div className="px-3 py-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Palette</span>
                      <div className="grid grid-cols-5 gap-2">
                        {PASTEL_COLORS.map(c => (
                          <button
                            key={c.value}
                            onClick={() => {
                              if (contextMenu.noteId) handleUpdateNote(contextMenu.noteId, { color: c.value });
                              setContextMenu(null);
                            }}
                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-125 transition-transform ring-1 ring-gray-100"
                            style={{ backgroundColor: c.value || '#FFFFFF' }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="px-3 py-2 border-t border-gray-50">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Display Size</span>
                      <div className="flex gap-2">
                        {(['sm', 'md', 'lg'] as const).map(s => (
                          <button
                            key={s}
                            onClick={() => {
                              if (contextMenu.noteId) handleUpdateNote(contextMenu.noteId, { size: s });
                              setContextMenu(null);
                            }}
                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all ${notes.find(n => n.id === contextMenu.noteId)?.size === s ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                          >
                            {s.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-1 border-t border-gray-50">
                      <button 
                        onClick={() => {
                          const note = notes.find(n => n.id === contextMenu.noteId);
                          if (note) {
                            openWindow(note.id);
                          }
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-purple-600 hover:bg-purple-50 flex items-center gap-3 transition-all rounded-2xl"
                      >
                        <Maximize2 size={16} /> Open / Edit
                      </button>
                      <button 
                        onClick={() => {
                          if (contextMenu.noteId) handlePopout(contextMenu.noteId);
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-3 transition-all rounded-2xl"
                      >
                        <ExternalLink size={16} /> Pop-out Note
                      </button>
                      <button 
                        onClick={() => {
                          const note = notes.find(n => n.id === contextMenu.noteId);
                          if (note) handleDuplicateNote(note);
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-3 transition-all rounded-2xl"
                      >
                        <Copy size={16} /> Duplicate Note
                      </button>
                      <button 
                        onClick={() => {
                          const note = notes.find(n => n.id === contextMenu.noteId);
                          if (note) toggleFavorite(note);
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-3 transition-all rounded-2xl"
                      >
                        <Star size={16} className={notes.find(n => n.id === contextMenu.noteId)?.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''} />
                        {notes.find(n => n.id === contextMenu.noteId)?.isFavorite ? 'Unfavorite' : 'Favorite'}
                      </button>
                      <button 
                        onClick={() => {
                          const note = notes.find(n => n.id === contextMenu.noteId);
                          if (note) handlePinNote(note.id, !note.isPinned);
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-3 transition-all rounded-2xl"
                      >
                        <Pin size={16} className={notes.find(n => n.id === contextMenu.noteId)?.isPinned ? 'fill-current' : ''} />
                        {notes.find(n => n.id === contextMenu.noteId)?.isPinned ? 'Unpin Note' : 'Pin Note'}
                      </button>
                      <button 
                        onClick={() => {
                          const note = notes.find(n => n.id === contextMenu.noteId);
                          if (note) toggleArchive(note);
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-3 transition-all rounded-2xl"
                      >
                        <Archive size={16} />
                        Archive Note
                      </button>
                      <button 
                        onClick={() => {
                          if (contextMenu.noteId) deleteNote(contextMenu.noteId);
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-rose-500 hover:bg-rose-50 flex items-center gap-3 transition-all rounded-2xl"
                      >
                        <Trash2 size={16} />
                        Delete Note
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

      {/* Custom Styles for Quill */}
      <style>{`
        .ql-container {
          font-family: inherit;
          font-size: inherit;
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
        .prose * {
          font-family: inherit;
        }
        .prose p {
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
          line-height: 1.4 !important;
        }
        .prose ul, .prose ol {
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
          padding-left: 1.25rem !important;
        }
        .prose li {
          margin-top: 0.125rem !important;
          margin-bottom: 0.125rem !important;
        }
        .prose h1, .prose h2, .prose h3, .prose h4 {
          margin-top: 0.5rem !important;
          margin-bottom: 0.25rem !important;
          line-height: 1.2 !important;
        }
        .note-content {
          word-break: normal;
          overflow-wrap: break-word;
          hyphens: none;
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

// Popout View Component for always-on-top windows
function PopoutView({ note, userSettings, statuses }: { note: Note, userSettings: UserSettings, statuses: StatusOption[] }) {
  const currentStatus = statuses.find(s => s.id === note.status) || statuses[0];
  
  useEffect(() => {
    document.title = `Note: ${note.title}`;
  }, [note.title]);

  return (
    <div 
      className={`min-h-screen p-6 flex flex-col ${userSettings.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}
      style={{ fontFamily: userSettings.defaultFont }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: currentStatus.color }}>
            <Type size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-0.5">{currentStatus.label}</span>
            <h1 className="text-xl font-bold line-clamp-1 tracking-tight">{note.title}</h1>
          </div>
        </div>
        <button 
          onClick={() => window.close()}
          className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
          title="Close Pop-out"
        >
          <X size={20} />
        </button>
      </div>
      
      <div 
        className={`flex-1 overflow-y-auto prose prose-lg max-w-none note-content p-6 rounded-3xl ${userSettings.theme === 'dark' ? 'prose-invert bg-gray-800/40' : 'bg-gray-50/40'}`}
        dir={!note.alignment ? "auto" : (note.alignment === 'right' ? 'rtl' : (note.alignment === 'left' ? 'ltr' : 'auto'))}
        style={{ 
          fontSize: userSettings.defaultSize || '16px', 
          textAlign: note.alignment || userSettings.defaultAlignment || 'start'
        }}
        dangerouslySetInnerHTML={{ __html: note.content }}
      />
      
      <div className="mt-6 pt-4 border-t border-gray-100/10 text-[10px] font-bold text-gray-400 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Notes For Myself - Pop-out Mode</span>
        </div>
        <span>Last updated: {note.updatedAt ? format(note.updatedAt.toDate(), 'MMM d, HH:mm') : 'Just now'}</span>
      </div>
    </div>
  );
}

// Settings Modal Component
function SettingsModal({ 
  isOpen, 
  onClose, 
  statuses, 
  setStatuses, 
  userSettings, 
  setUserSettings, 
  onSave,
  folders,
  taskLists,
  requestNotificationPermission
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  statuses: StatusOption[], 
  setStatuses: React.Dispatch<React.SetStateAction<StatusOption[]>>,
  userSettings: UserSettings,
  setUserSettings: React.Dispatch<React.SetStateAction<UserSettings>>,
  onSave: (statuses: StatusOption[], settings: UserSettings) => Promise<void>,
  folders: FolderType[],
  taskLists: TaskList[],
  requestNotificationPermission: () => Promise<void>
}) {
  const [localStatuses, setLocalStatuses] = useState<StatusOption[]>(statuses);
  const [localSettings, setLocalSettings] = useState<UserSettings>(userSettings);
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'statuses'>('general');

  useEffect(() => {
    setLocalStatuses(statuses);
    setLocalSettings(userSettings);
  }, [statuses, userSettings]);

  const handleAddStatus = () => {
    const newId = `status-${Date.now()}`;
    setLocalStatuses([...localStatuses, { id: newId, label: 'New Status', color: '#94A3B8', isVisible: true }]);
  };

  const handleRemoveStatus = (id: string) => {
    if (localStatuses.length <= 1) return;
    setLocalStatuses(localStatuses.filter(s => s.id !== id));
  };

  const handleStatusChange = (id: string, field: keyof StatusOption, value: any) => {
    setLocalStatuses(localStatuses.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={`relative ${localSettings.theme === 'dark' ? 'glass-dark' : 'glass'} w-[92%] max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[80vh] md:h-auto md:max-h-[90vh] border border-white/20`}
          >
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <Settings size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-gray-900">Settings</h2>
                  <p className="text-gray-500 text-xs mt-0.5">Customize your workspace</p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 hover:bg-black/5 rounded-2xl transition-all active:scale-90">
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            <div className={`flex flex-1 overflow-hidden ${isMobile() ? 'flex-col' : ''}`}>
              {/* Sidebar Tabs */}
              <div className={`${isMobile() ? 'w-full flex overflow-x-auto border-b no-scrollbar' : 'w-56 border-r'} p-4 space-y-1 md:space-y-1 ${localSettings.theme === 'dark' ? 'bg-gray-800/20' : 'bg-gray-50/20'}`}>
                <button 
                  onClick={() => setActiveTab('general')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all shrink-0 ${activeTab === 'general' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-white/50'}`}
                >
                  <Settings size={18} /> General
                </button>
                <button 
                  onClick={() => setActiveTab('appearance')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all shrink-0 ${activeTab === 'appearance' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-white/50'}`}
                >
                  <Palette size={18} /> Appearance
                </button>
                <button 
                  onClick={() => setActiveTab('statuses')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all shrink-0 ${activeTab === 'statuses' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-white/50'}`}
                >
                  <Layout size={18} /> Statuses
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8">
                {activeTab === 'general' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <section className="space-y-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Default Folders & Lists</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-2">Default Folder</label>
                          <select 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                            value={localSettings.defaultFolderId || ''}
                            onChange={(e) => setLocalSettings({ ...localSettings, defaultFolderId: e.target.value || null })}
                          >
                            <option value="">No Default Folder</option>
                            {folders.map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-2">Default Task List</label>
                          <select 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                            value={localSettings.defaultTaskListId || ''}
                            onChange={(e) => setLocalSettings({ ...localSettings, defaultTaskListId: e.target.value || null })}
                          >
                            <option value="">No Default List</option>
                            {taskLists.map(l => (
                              <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-2">Startup Folder</label>
                          <select 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                            value={localSettings.startupFolderId || ''}
                            onChange={(e) => setLocalSettings({ ...localSettings, startupFolderId: e.target.value || null })}
                          >
                            <option value="">All Notes (Default)</option>
                            {folders.map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-2">Startup Task List</label>
                          <select 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                            value={localSettings.startupTaskListId || ''}
                            onChange={(e) => setLocalSettings({ ...localSettings, startupTaskListId: e.target.value || null })}
                          >
                            <option value="">No Default List</option>
                            {taskLists.map(l => (
                              <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Notifications</h3>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${localSettings.enableNotifications ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                            <Bell size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-700">Desktop Notifications</p>
                            <p className="text-xs text-gray-500">Get notified about due tasks and notes</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            if (!localSettings.enableNotifications) {
                              requestNotificationPermission();
                            } else {
                              setLocalSettings({ ...localSettings, enableNotifications: false });
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${localSettings.enableNotifications ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {localSettings.enableNotifications ? 'Enabled' : 'Enable'}
                        </button>
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <section className="space-y-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">App Theme</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(['light', 'dark', 'glass', 'minimal'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setLocalSettings({ ...localSettings, theme: t })}
                            className={`p-4 rounded-2xl border-2 transition-all text-center capitalize font-bold ${localSettings.theme === t ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Board Background (Global)</h3>
                      <input 
                        type="text" 
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all font-bold"
                        value={localSettings.boardTheme}
                        onChange={(e) => setLocalSettings({ ...localSettings, boardTheme: e.target.value })}
                        placeholder="#F9F7FF or linear-gradient(...) or image URL"
                      />
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Typography & Layout</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-2">Default Font</label>
                          <select 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                            value={localSettings.defaultFont}
                            onChange={(e) => setLocalSettings({ ...localSettings, defaultFont: e.target.value })}
                          >
                            <option value="Inter">Inter (Sans)</option>
                            <option value="JetBrains Mono">JetBrains Mono (Mono)</option>
                            <option value="Playfair Display">Playfair Display (Serif)</option>
                            <option value="Outfit">Outfit</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-2">Default Size</label>
                          <select 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                            value={localSettings.defaultSize}
                            onChange={(e) => setLocalSettings({ ...localSettings, defaultSize: e.target.value })}
                          >
                            <option value="14px">Small (14px)</option>
                            <option value="16px">Normal (16px)</option>
                            <option value="18px">Large (18px)</option>
                            <option value="20px">Huge (20px)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-2">Default Alignment</label>
                          <select 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                            value={localSettings.defaultAlignment}
                            onChange={(e) => setLocalSettings({ ...localSettings, defaultAlignment: e.target.value as any })}
                          >
                            <option value="left">Left (LTR)</option>
                            <option value="right">Right (RTL)</option>
                            <option value="center">Center</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-2">Max Notes per Column (Workflow)</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="100"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm"
                            value={localSettings.notesPerColumn}
                            onChange={(e) => setLocalSettings({ ...localSettings, notesPerColumn: parseInt(e.target.value) || 10 })}
                          />
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'statuses' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <section className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status Titles & Colors</h3>
                        <button 
                          onClick={handleAddStatus}
                          className="flex items-center gap-1 text-xs font-bold text-purple-500 hover:text-purple-600 transition-colors"
                        >
                          <Plus size={14} /> Add Status
                        </button>
                      </div>
                      <div className="space-y-3">
                        {localStatuses.map((status) => (
                          <div key={status.id} className="flex flex-col md:flex-row md:items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <div className="flex items-center gap-3 flex-1">
                              <input 
                                type="color" 
                                value={status.color}
                                onChange={(e) => handleStatusChange(status.id, 'color', e.target.value)}
                                className="w-10 h-10 rounded-lg border-0 p-0 cursor-pointer bg-transparent shrink-0"
                              />
                              <input 
                                type="text"
                                value={status.label}
                                onChange={(e) => handleStatusChange(status.id, 'label', e.target.value)}
                                className="flex-1 bg-white border border-gray-200 rounded-xl p-2 text-sm font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                placeholder="Status Name"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleStatusChange(status.id, 'isVisible', !status.isVisible)}
                                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all ${status.isVisible ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                              >
                                {status.isVisible ? 'Visible' : 'Hidden'}
                              </button>
                              <button 
                                onClick={() => handleRemoveStatus(status.id)}
                                className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Delete Status"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </div>

            <div className={`p-6 border-t flex justify-end gap-3 ${localSettings.theme === 'dark' ? 'bg-gray-800/40' : 'bg-gray-50/40'}`}>
              <button 
                onClick={onClose}
                className="px-6 py-3 bg-white border border-gray-300 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => onSave(localStatuses, localSettings)}
                className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
