// User & Authentication Models
export interface User {
    uid: string;
    mobile: string;
    name?: string;
    email?: string;
    profileImage?: string;
    role?: 'admin' | 'user';
    createdAt?: Date;
    mpin?: string;
}

// Document & Folder Models
export interface Document {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    folderId: string | null;
    userId: string;
    date: Date;
    icon?: string;
    sharedBy?: string;
    sharedWith?: string[];
}

export interface Folder {
    id: string;
    name: string;
    parentId: string | null;
    userId: string;
    createdAt: Date;
    icon?: string;
    color?: string;
    itemCount?: number;
}

// Card Models
export interface Card {
    id: string;
    name: string;
    type: 'credit' | 'debit';
    number: string;
    expiryDate: string;
    cvv: string;
    holderName: string;
    bankName?: string;
    brand?: 'visa' | 'mastercard' | 'rupay';
    color?: string;
    userId: string;
    createdAt?: Date;
}

// QR Code Models
export interface QRCode {
    id: string;
    name: string;
    mpin: string;
    linkedDocumentIds: string[];
    userId: string;
    createdAt: Date;
    updatedAt?: Date;
}

// Friend/People Models
export interface Friend {
    uid: string;
    name: string;
    email?: string;
    mobile?: string;
    profileImage?: string;
    status?: 'pending' | 'accepted' | 'blocked';
    sharedDocuments?: number;
    sharedCards?: number;
    activeRequests?: number;
}

// Notification Models
export interface Notification {
    id: string;
    type: 'friend_request' | 'document_shared' | 'card_shared' | 'system';
    title: string;
    message: string;
    from?: string;
    fromName?: string;
    fromImage?: string;
    read: boolean;
    createdAt: Date;
    actionUrl?: string;
    metadata?: Record<string, any>;
}

// App Configuration
export interface AppConfig {
    maxPdfSizeAllowed: number;
    maxImgSizeAllowed: number;
    maxStorageAllowed: number;
    maxDocumentsAllowed: number;
    maxCardsAllowed: number;
    maxQRsAllowed: number;
    [key: string]: any;
}

// UI Models
export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
}

export interface Quote {
    text: string;
    author: string;
}

export interface DropdownOption {
    label: string;
    value: any;
    icon?: string;
    disabled?: boolean;
}

// File System (Legacy - consider deprecating in favor of Document/Folder)
export interface FileSystemItem {
    id: string;
    name: string;
    type: 'folder' | 'document';
    parentId: string | null;
    userId: string;
    createdAt: Date;
    icon?: string;
}
