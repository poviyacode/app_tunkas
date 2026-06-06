export interface DropdownMenuItem {
    label: string;
    icon: string;
    color?: string;
    action: (data?: any) => void;
    visible: boolean;
}