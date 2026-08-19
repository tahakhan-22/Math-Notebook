export interface ThemeColors {
    background: string;
    surface: string;
    surfaceElevated: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textMuted: string;
    border: string;
    glow: string;
    canvasBg: string;
    canvasGrid: string;
    graphPrimaryCurve: string;
    graphSecondaryCurve: string;
    graphAxis: string;
    graphGrid: string;
}

export interface BackgroundEffect {
    type: 'grid-pattern' | 'dot-pattern' | 'academic-lines' | 'none';
}

export interface AppTheme {
    id: string;
    name: string;
    subtitle?: string;
    description: string;
    previewColors: string[];
    colors: ThemeColors;
    backgroundEffect?: BackgroundEffect;
    assistantStyle?: {
        avatarTitle: string;
    };
}
