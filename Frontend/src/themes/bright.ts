import { AppTheme } from './types';

export const brightTheme: AppTheme = {
    id: 'bright',
    name: 'Bright Notebook',
    subtitle: 'Standard Light Paper Surface',
    description: 'Clean bright academic paper notebook surface with high-contrast dark text & emerald accents.',
    previewColors: ['#f8fafc', '#059669', '#2563eb'],
    colors: {
        background: '#f1f5f9',
        surface: '#ffffff',
        surfaceElevated: '#e2e8f0',
        primary: '#059669',
        secondary: '#2563eb',
        accent: '#7c3aed',
        text: '#0f172a',
        textMuted: '#64748b',
        border: '#cbd5e1',
        glow: 'rgba(5, 150, 105, 0.25)',
        canvasBg: '#ffffff',
        canvasGrid: '#e2e8f0',
        graphPrimaryCurve: '#059669',
        graphSecondaryCurve: '#2563eb',
        graphAxis: '#64748b',
        graphGrid: '#cbd5e1'
    },
    backgroundEffect: {
        type: 'grid-pattern'
    },
    assistantStyle: {
        avatarTitle: 'AI Math Tutor'
    }
};
