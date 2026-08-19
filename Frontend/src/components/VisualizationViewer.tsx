import React, { useEffect, useRef, useState } from 'react';
import { X, Maximize2, ZoomIn, ZoomOut, RefreshCcw, Grid } from 'lucide-react';
import { useTheme } from '@/themes/ThemeContext';

interface Annotation {
    type: string;
    x: number;
    y?: number;
    label?: string;
}

interface SecondaryExpression {
    expression: string;
    label?: string;
}

interface VisualizationInstructions {
    expression?: string;
    secondary_expressions?: SecondaryExpression[];
    x_range?: [number, number];
    y_range?: [number, number];
    annotations?: Annotation[];
}

interface VisualizationSpec {
    available: boolean;
    type: string;
    instructions: VisualizationInstructions;
}

interface VisualizationViewerProps {
    spec: VisualizationSpec;
    onClose: () => void;
}

export const VisualizationViewer: React.FC<VisualizationViewerProps> = ({ spec, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { activeTheme } = useTheme();
    const [zoomFactor, setZoomFactor] = useState(1.0);
    const [showGrid, setShowGrid] = useState(true);
    const [showPrimary, setShowPrimary] = useState(true);
    const [showSecondary, setShowSecondary] = useState(true);

    const inst = spec.instructions;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        // Active theme graph background
        ctx.fillStyle = activeTheme.colors.background;
        ctx.fillRect(0, 0, width, height);

        const basexMin = inst.x_range?.[0] ?? -5;
        const basexMax = inst.x_range?.[1] ?? 5;
        const baseyMin = inst.y_range?.[0] ?? -5;
        const baseyMax = inst.y_range?.[1] ?? 5;

        const xMin = basexMin / zoomFactor;
        const xMax = basexMax / zoomFactor;
        const yMin = baseyMin / zoomFactor;
        const yMax = baseyMax / zoomFactor;

        const cx = width / 2;
        const cy = height / 2;

        const scaleX = width / (xMax - xMin);
        const scaleY = height / (yMax - yMin);

        const toScreenX = (x: number) => cx + (x - (xMin + xMax) / 2) * scaleX;
        const toScreenY = (y: number) => cy - (y - (yMin + yMax) / 2) * scaleY;

        // 1. Grid Lines & Numeric Ticks
        if (showGrid) {
            ctx.strokeStyle = activeTheme.colors.graphGrid;
            ctx.lineWidth = 1;

            const stepX = (xMax - xMin) > 10 ? 2 : 1;
            const stepY = (yMax - yMin) > 10 ? 2 : 1;

            for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += stepX) {
                const sx = toScreenX(x);
                ctx.beginPath();
                ctx.moveTo(sx, 0);
                ctx.lineTo(sx, height);
                ctx.stroke();

                // X-axis Tick Numbers
                ctx.fillStyle = activeTheme.colors.textMuted;
                ctx.font = '10px sans-serif';
                ctx.fillText(x.toString(), sx - 4, cy + 14);
            }

            for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += stepY) {
                const sy = toScreenY(y);
                ctx.beginPath();
                ctx.moveTo(0, sy);
                ctx.lineTo(width, sy);
                ctx.stroke();

                // Y-axis Tick Numbers
                if (y !== 0) {
                    ctx.fillStyle = activeTheme.colors.textMuted;
                    ctx.font = '10px sans-serif';
                    ctx.fillText(y.toString(), cx - 18, sy + 4);
                }
            }
        }

        // 2. Cartesian Axes & Arrows
        ctx.strokeStyle = activeTheme.colors.graphAxis;
        ctx.lineWidth = 2;
        // X-axis
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(width, cy);
        ctx.stroke();
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, height);
        ctx.stroke();

        // 3. Primary Expression Plot
        if (showPrimary && inst.expression) {
            ctx.strokeStyle = activeTheme.colors.graphPrimaryCurve;
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.beginPath();

            let isFirst = true;
            for (let px = 0; px < width; px += 1) {
                const xVal = xMin + (px / width) * (xMax - xMin);
                try {
                    const cleanExpr = inst.expression.replace(/\^/g, '**').replace(/sin/g, 'Math.sin').replace(/cos/g, 'Math.cos').replace(/sqrt/g, 'Math.sqrt');
                    const yVal = Function('x', `return ${cleanExpr}`)(xVal);
                    if (typeof yVal === 'number' && !isNaN(yVal) && isFinite(yVal)) {
                        const py = toScreenY(yVal);
                        if (isFirst) {
                            ctx.moveTo(px, py);
                            isFirst = false;
                        } else {
                            ctx.lineTo(px, py);
                        }
                    }
                } catch {
                    // Ignore plot errors
                }
            }
            ctx.stroke();
        }

        // 4. Secondary Expression Plot (Derivative / Solution / Antiderivative)
        if (showSecondary && inst.secondary_expressions && inst.secondary_expressions.length > 0) {
            inst.secondary_expressions.forEach((sec) => {
                ctx.strokeStyle = activeTheme.colors.graphSecondaryCurve;
                ctx.lineWidth = 2.5;
                ctx.setLineDash([6, 4]); // Dashed line for derived curves
                ctx.beginPath();

                let isFirst = true;
                for (let px = 0; px < width; px += 1) {
                    const xVal = xMin + (px / width) * (xMax - xMin);
                    try {
                        const cleanExpr = sec.expression.replace(/\^/g, '**').replace(/sin/g, 'Math.sin').replace(/cos/g, 'Math.cos').replace(/sqrt/g, 'Math.sqrt');
                        const yVal = Function('x', `return ${cleanExpr}`)(xVal);
                        if (typeof yVal === 'number' && !isNaN(yVal) && isFinite(yVal)) {
                            const py = toScreenY(yVal);
                            if (isFirst) {
                                ctx.moveTo(px, py);
                                isFirst = false;
                            } else {
                                ctx.lineTo(px, py);
                            }
                        }
                    } catch {
                        // Ignore plot errors
                    }
                }
                ctx.stroke();
                ctx.setLineDash([]); // Reset line dash
            });
        }

        // 5. Annotations (Critical Points, Roots, Minima/Maxima)
        if (inst.annotations) {
            for (const ann of inst.annotations) {
                const sx = toScreenX(ann.x);
                const sy = ann.y !== undefined ? toScreenY(ann.y) : cy;

                ctx.fillStyle = activeTheme.colors.accent;
                ctx.beginPath();
                ctx.arc(sx, sy, 6, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                if (ann.label) {
                    ctx.fillStyle = activeTheme.colors.text;
                    ctx.font = 'bold 11px sans-serif';
                    ctx.fillText(`${ann.label} (${ann.x.toFixed(1)}${ann.y !== undefined ? `, ${ann.y.toFixed(1)}` : ''})`, sx + 8, sy - 8);
                }
            }
        }
    }, [inst, zoomFactor, showGrid, showPrimary, showSecondary, activeTheme]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
            <div 
                className="relative w-full max-w-3xl border rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300"
                style={{ backgroundColor: activeTheme.colors.surface, borderColor: activeTheme.colors.border }}
            >
                {/* Header & Controls Toolbar */}
                <div 
                    className="flex flex-wrap items-center justify-between px-4 py-3 border-b gap-2"
                    style={{ backgroundColor: activeTheme.colors.background, borderColor: activeTheme.colors.border }}
                >
                    <div className="flex items-center gap-2">
                        <Maximize2 className="w-4 h-4" style={{ color: activeTheme.colors.primary }} />
                        <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: activeTheme.colors.text }}>
                            Mathematical Plotter ({spec.type.replace('_', ' ')})
                        </span>
                    </div>

                    {/* Touch Control Toolbar */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowGrid(!showGrid)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border transition-colors"
                            style={{ 
                                backgroundColor: activeTheme.colors.surfaceElevated, 
                                borderColor: showGrid ? activeTheme.colors.primary : activeTheme.colors.border,
                                color: showGrid ? activeTheme.colors.primary : activeTheme.colors.textMuted
                            }}
                            title="Toggle Grid"
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setZoomFactor((z) => Math.min(z * 1.3, 3.0))}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center border rounded-lg"
                            style={{ backgroundColor: activeTheme.colors.surfaceElevated, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }}
                            title="Zoom In"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setZoomFactor((z) => Math.max(z / 1.3, 0.4))}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center border rounded-lg"
                            style={{ backgroundColor: activeTheme.colors.surfaceElevated, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }}
                            title="Zoom Out"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setZoomFactor(1.0)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center border rounded-lg"
                            style={{ backgroundColor: activeTheme.colors.surfaceElevated, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }}
                            title="Reset View"
                        >
                            <RefreshCcw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
                            style={{ color: activeTheme.colors.textMuted }}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Canvas Render Surface */}
                <div className="relative w-full h-80 flex items-center justify-center" style={{ backgroundColor: activeTheme.colors.background }}>
                    <canvas
                        ref={canvasRef}
                        width={700}
                        height={340}
                        className="w-full h-full object-contain"
                    />

                    {/* Interactive Graph Legend */}
                    <div 
                        className="absolute top-3 left-3 border backdrop-blur-md rounded-xl p-2.5 space-y-1 text-xs shadow-xl"
                        style={{ backgroundColor: `${activeTheme.colors.surface}f0`, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }}
                    >
                        {inst.expression && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showPrimary}
                                    onChange={(e) => setShowPrimary(e.target.checked)}
                                    className="rounded"
                                    style={{ accentColor: activeTheme.colors.graphPrimaryCurve }}
                                />
                                <span className="w-4 h-0.5 inline-block" style={{ backgroundColor: activeTheme.colors.graphPrimaryCurve }} />
                                <span className="font-mono" style={{ color: activeTheme.colors.graphPrimaryCurve }}>f(x) = {inst.expression}</span>
                            </label>
                        )}
                        {inst.secondary_expressions && inst.secondary_expressions.map((sec, idx) => (
                            <label key={idx} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showSecondary}
                                    onChange={(e) => setShowSecondary(e.target.checked)}
                                    className="rounded"
                                    style={{ accentColor: activeTheme.colors.graphSecondaryCurve }}
                                />
                                <span className="w-4 border-b-2 border-dashed inline-block" style={{ borderColor: activeTheme.colors.graphSecondaryCurve }} />
                                <span className="font-mono" style={{ color: activeTheme.colors.graphSecondaryCurve }}>{sec.label || 'Derivative'}: {sec.expression}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
