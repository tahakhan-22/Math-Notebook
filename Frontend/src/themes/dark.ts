import { AppTheme } from './types';

export const darkTheme: AppTheme = {
    id: 'dark',
    name: 'Dark Notebook',
    subtitle: 'Standard Dark Surface',
    description: 'Clean dark slate notebook surface with high-contrast emerald & cyan accents.',
    previewColors: ['#090d16', '#10b981', '#3b82f6'],
    colors: {
        background: '#090d16',
        surface: '#111827',
        surfaceElevated: '#1f2937',
        primary: '#10b981',
        secondary: '#3b82f6',
        accent: '#8b5cf6',
        text: '#f9fafb',
        textMuted: '#9ca3af',
        border: '#1f2937',
        glow: 'rgba(16, 185, 129, 0.25)',
        canvasBg: '#000000',
        canvasGrid: '#1f2937',
        graphPrimaryCurve: '#10b981',
        graphSecondaryCurve: '#06b6d4',
        graphAxis: '#475569',
        graphGrid: '#1e293b'
    },
    backgroundEffect: {
        type: 'grid-pattern'
    },
    assistantStyle: {
        avatarTitle: 'AI Math Tutor'
    }
};
