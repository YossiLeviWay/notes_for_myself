import { Timestamp } from 'firebase/firestore';

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  tags: string[];
  dueDate: any;
  createdAt: any;
  updatedAt: any;
  color?: string;
  uid: string;
  isFavorite: boolean;
  isArchived: boolean;
  isPinned: boolean;
  isCollapsed: boolean;
  size?: 'sm' | 'md' | 'lg';
  alignment?: 'left' | 'center' | 'right' | 'justify';
  imageUrl?: string;
  status: string;
}

export interface FolderType {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: any;
  background?: string;
  wallpaper?: string;
}

export interface ProjectItem {
  id: string;
  type: 'note' | 'folder' | 'task' | 'image';
  refId: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isFavorite?: boolean;
  items?: ProjectItem[];
  createdAt: any;
  uid: string;
}

export interface WorkspacePaneConfig {
  id: string;
  viewMode: string;
  currentFolderId: string | null;
  currentProjectId?: string | null;
  searchQuery: string;
}

export interface WorkspaceLayout {
  id: string;
  name: string;
  panes: WorkspacePaneConfig[];
}

export interface UserSettings {
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
  panes?: WorkspacePaneConfig[];
  activePaneId?: string;
  savedLayouts?: WorkspaceLayout[];
}

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  isPinned: boolean;
  isArchived: boolean;
  listId: string;
  noteId?: string;
  dueDate?: any;
  createdAt: any;
  uid: string;
}

export interface TaskList {
  id: string;
  name: string;
  isFavorite: boolean;
  createdAt: any;
  uid: string;
}

export interface StatusOption {
  id: string;
  label: string;
  color: string;
  isVisible: boolean;
  background?: string;
}

export interface ActiveWindow {
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

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  uid: string;
}
