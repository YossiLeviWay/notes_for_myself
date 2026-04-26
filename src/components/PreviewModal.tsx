import React from 'react';
import { motion } from 'motion/react';
import { X, Eye, Grid, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Note, FolderType, Project, UserSettings } from '../App';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: { type: 'folder' | 'project', id: string, name: string } | null;
  notes: Note[];
  folders: FolderType[];
  projects: Project[];
  userSettings: UserSettings;
  onOpenNote: (id: string) => void;
}

export default function PreviewModal({ isOpen, onClose, data, notes, folders, projects, userSettings, onOpenNote }: PreviewModalProps) {
  if (!isOpen || !data) return null;

  const getNotes = () => {
    if (data.type === 'folder') {
      const getChildFolderIds = (parentId: string): string[] => {
        const children = folders.filter(f => f.parentId === parentId);
        return [parentId, ...children.flatMap(child => getChildFolderIds(child.id))];
      };
      const allFolderIds = getChildFolderIds(data.id);
      return notes.filter(n => allFolderIds.includes(n.folderId || ''));
    } else {
      const project = projects.find(p => p.id === data.id);
      if (!project) return [];
      const noteIds = project.items?.filter(item => item.type === 'note').map(item => item.refId) || [];
      return notes.filter(n => noteIds.includes(n.id));
    }
  };

  const filteredNotes = getNotes();

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={`relative w-full max-w-6xl max-h-[90vh] ${userSettings.theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} rounded-[3rem] shadow-2xl border flex flex-col overflow-hidden`}
      >
        <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
          <div>
            <div className="flex items-center gap-3 text-primary font-black uppercase text-xs tracking-widest mb-2">
              <Eye size={16} /> {data.type} Preview
            </div>
            <h2 className="text-3xl font-black tracking-tight">{data.name}</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all hover:rotate-90"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          {filteredNotes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-gray-50 text-gray-200 rounded-[2rem] flex items-center justify-center mb-6">
                <Grid size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-400">No notes found for this {data.type}</h3>
              <p className="text-gray-400 mt-2">Try adding some notes to this {data.type} to see them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotes.map(note => (
                <motion.div 
                  key={note.id}
                  whileHover={{ y: -5 }}
                  onClick={() => { onOpenNote(note.id); onClose(); }}
                  className={`p-6 rounded-[2rem] cursor-pointer transition-all border-2 border-transparent hover:border-primary/20 ${userSettings.theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} shadow-sm hover:shadow-xl`}
                  style={{ borderLeftColor: note.color || '#3b82f6' }}
                >
                  <h3 className="font-black text-lg mb-2 line-clamp-1">{note.title}</h3>
                  <div className="text-sm text-gray-500 line-clamp-3 mb-4 no-scrollbar prose prose-sm overflow-hidden" dangerouslySetInnerHTML={{ __html: note.content }} />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                       {note.updatedAt?.toDate ? format(note.updatedAt.toDate(), 'MMM d, yyyy') : 'No date'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                      <ExternalLink size={14} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
