import React from 'react';
import { useTheme } from '@/themes/ThemeContext';

interface ThemeBackgroundOverlayProps {
    isDrawing: boolean;
}

export const ThemeBackgroundOverlay: React.FC<ThemeBackgroundOverlayProps> = ({ isDrawing }) => {
    const { activeTheme } = useTheme();
    const effectType = activeTheme.backgroundEffect?.type || 'grid-pattern';

    // Subtle academic pattern opacity
    const overlayOpacity = isDrawing ? 0.05 : 0.20;

    return (
        <div 
            className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden transition-all duration-500 ease-in-out select-none"
            style={{ 
                opacity: overlayOpacity
            }}
        >
            {/* Dot Pattern */}
            {effectType === 'dot-pattern' && (
                <div 
                    className="w-full h-full"
                    style={{
                        backgroundImage: `radial-gradient(${activeTheme.colors.primary} 1px, transparent 1px)`,
                        backgroundSize: '24px 24px'
                    }}
                />
            )}

            {/* Academic Grid Pattern */}
            {effectType === 'grid-pattern' && (
                <div 
                    className="w-full h-full"
                    style={{
                        backgroundImage: `linear-gradient(${activeTheme.colors.border} 1px, transparent 1px), linear-gradient(90deg, ${activeTheme.colors.border} 1px, transparent 1px)`,
                        backgroundSize: '32px 32px'
                    }}
                />
            )}

            {/* Academic Lines */}
            {effectType === 'academic-lines' && (
                <div 
                    className="w-full h-full"
                    style={{
                        backgroundImage: `linear-gradient(${activeTheme.colors.border} 1px, transparent 1px)`,
                        backgroundSize: '100% 28px'
                    }}
                />
            )}
        </div>
    );
};
