import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppTheme, AVAILABLE_THEMES, darkTheme } from './index';

interface ThemeContextType {
    activeTheme: AppTheme;
    setThemeId: (id: string) => void;
    availableThemes: AppTheme[];
}

const STORAGE_KEY = 'ipad-math-note-theme';

const ThemeContext = createContext<ThemeContextType>({
    activeTheme: darkTheme,
    setThemeId: () => {},
    availableThemes: AVAILABLE_THEMES
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeTheme, setActiveTheme] = useState<AppTheme>(() => {
        try {
            const savedId = localStorage.getItem(STORAGE_KEY);
            if (savedId) {
                const found = AVAILABLE_THEMES.find(t => t.id === savedId);
                if (found) return found;
            }
        } catch (e) {
            console.error("Failed to load theme from localStorage:", e);
        }
        return darkTheme;
    });

    const setThemeId = (id: string) => {
        const found = AVAILABLE_THEMES.find(t => t.id === id);
        if (found) {
            setActiveTheme(found);
            try {
                localStorage.setItem(STORAGE_KEY, id);
            } catch (e) {
                console.error("Failed to save theme to localStorage:", e);
            }
        }
    };

    // Dynamically apply CSS custom variables to :root
    useEffect(() => {
        const root = document.documentElement;
        const c = activeTheme.colors;

        root.style.setProperty('--theme-bg', c.background);
        root.style.setProperty('--theme-surface', c.surface);
        root.style.setProperty('--theme-surface-elevated', c.surfaceElevated);
        root.style.setProperty('--theme-primary', c.primary);
        root.style.setProperty('--theme-secondary', c.secondary);
        root.style.setProperty('--theme-accent', c.accent);
        root.style.setProperty('--theme-text', c.text);
        root.style.setProperty('--theme-text-muted', c.textMuted);
        root.style.setProperty('--theme-border', c.border);
        root.style.setProperty('--theme-glow', c.glow);
        root.style.setProperty('--theme-canvas-bg', c.canvasBg);
        root.style.setProperty('--theme-canvas-grid', c.canvasGrid);
    }, [activeTheme]);

    return (
        <ThemeContext.Provider value={{ activeTheme, setThemeId, availableThemes: AVAILABLE_THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
