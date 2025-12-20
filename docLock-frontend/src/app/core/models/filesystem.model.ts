export type FileType = 'folder' | 'pdf' | 'img' | 'doc' | 'other';

export interface FileSystemItem {
    id: string;
    parentId: string | null; // null for root
    name: string;
    type: FileType;
    dateCreated: string; // ISO String
    dateModified: string;
    size?: number | string; // Size in bytes or formatted string
    url?: string; // For mock/real files
    mpinLocked?: boolean; // Specific lock override
    isShared?: boolean;
}

export interface Folder extends FileSystemItem {
    type: 'folder';
    children?: FileSystemItem[]; // Optional for tree view
}

export interface Document extends FileSystemItem {
    type: 'pdf' | 'img' | 'doc' | 'other';
}
