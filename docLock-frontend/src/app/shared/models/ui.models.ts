// Bottom Sheet & Modal Models
export interface SheetButton {
    label: string;
    action: 'confirm' | 'cancel' | 'custom';
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    loading?: boolean;
    disabled?: boolean;
    customHandler?: () => void;
}

export interface SheetIcon {
    type: 'svg' | 'emoji' | 'image';
    content: string;
    bgColor?: string;
    iconColor?: string;
}

export interface SheetConfig {
    title?: string;
    message?: string;
    icon?: SheetIcon;
    buttons?: SheetButton[];
    variant?: 'danger' | 'warning' | 'info' | 'success' | 'profile';
    showDragHandle?: boolean;
    allowBackdropClose?: boolean;
}
