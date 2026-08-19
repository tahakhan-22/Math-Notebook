import React from 'react';
import { X, Check, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/themes/ThemeContext';

interface ThemeSelectorProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ isOpen, onClose }) => {
    const { activeTheme, setThemeId, availableThemes } = useTheme();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div 
                className="relative w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-colors duration-300"
                style={{ backgroundColor: activeTheme.colors.surface, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ backgroundColor: activeTheme.colors.background, borderColor: activeTheme.colors.border }}>
                    <div className="flex items-center gap-2.5">
                        {activeTheme.id === 'dark' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                        <h3 className="text-base font-semibold">Select Theme Mode</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors"
                        style={{ color: activeTheme.colors.textMuted }}
                        title="Close Theme Selector"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Simple 2-Option Theme Cards: Dark vs Bright */}
                <div className="p-5 space-y-3">
                    {availableThemes.map((t) => {
                        const isSelected = activeTheme.id === t.id;
                        return (
                            <div
                                key={t.id}
                                onClick={() => {
                                    setThemeId(t.id);
                                }}
                                className="p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between"
                                style={{
                                    backgroundColor: isSelected ? activeTheme.colors.surfaceElevated : activeTheme.colors.background,
                                    borderColor: isSelected ? activeTheme.colors.primary : activeTheme.colors.border
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="p-2.5 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: t.id === 'dark' ? '#090d16' : '#ffffff', border: '1px solid #cbd5e1' }}
                                    >
                                        {t.id === 'dark' ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold">{t.name}</span>
                                            {isSelected && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 border text-emerald-400 rounded-full" style={{ backgroundColor: `${activeTheme.colors.primary}20`, borderColor: activeTheme.colors.primary }}>
                                                    <Check className="w-3 h-3" /> Active
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs mt-0.5" style={{ color: activeTheme.colors.textMuted }}>{t.description}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setThemeId(t.id);
                                    }}
                                    className="px-3 py-2 text-xs font-semibold rounded-xl min-h-[44px] transition-all text-white"
                                    style={{ backgroundColor: activeTheme.colors.primary }}
                                >
                                    {isSelected ? 'Active' : 'Select'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
