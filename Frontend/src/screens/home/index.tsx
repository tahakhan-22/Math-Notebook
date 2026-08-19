import { ColorSwatch, Group } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import Draggable from 'react-draggable';
import { SWATCHES, STROKE_SIZES, TOOL_MODES } from '@/constants';
import { 
    Undo, 
    Redo, 
    Trash2, 
    RotateCcw, 
    Pencil, 
    Eraser, 
    Loader2, 
    Play, 
    AlertCircle, 
    X,
    Sparkles,
    Palette
} from 'lucide-react';
import { AssistantPanel, AssistantResponse } from '@/components/AssistantPanel';
import { VisualizationViewer } from '@/components/VisualizationViewer';
import { ContextualActionBar } from '@/components/ContextualActionBar';
import { ThemeSelector } from '@/components/ThemeSelector';
import { ThemeBackgroundOverlay } from '@/components/ThemeBackgroundOverlay';
import { NotebookItem } from '@/types/notebook';
import { useTheme } from '@/themes/ThemeContext';

declare global {
    interface Window {
        MathJax: unknown;
    }
}

interface Response {
    expr: string;
    result: string | number;
    assign: boolean;
}

interface Point {
    x: number;
    y: number;
}

interface Stroke {
    points: Point[];
    color: string;
    size: number;
    isEraser: boolean;
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { activeTheme } = useTheme();
    
    // Drawing & Tool State
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState<string>('rgb(255, 255, 255)');
    const [strokeSize, setStrokeSize] = useState<number>(STROKE_SIZES.MEDIUM);
    const [toolMode, setToolMode] = useState<'pencil' | 'eraser'>(TOOL_MODES.PENCIL);
    
    // Stroke History State for Undo/Redo
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [redoStack, setRedoStack] = useState<Stroke[]>([]);
    const currentStrokeRef = useRef<Stroke | null>(null);
    const strokesRef = useRef<Stroke[]>([]);
    
    // API & Notebook Items State
    const [dictOfVars, setDictOfVars] = useState<Record<string, unknown>>({});
    const [notebookItems, setNotebookItems] = useState<NotebookItem[]>([]);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Theme & AI Assistant State
    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [assistantResponse, setAssistantResponse] = useState<AssistantResponse | null>(null);
    const [isAssistantLoading, setIsAssistantLoading] = useState(false);
    const [isVisualizationVisible, setIsVisualizationVisible] = useState(false);

    // Selected Notebook Item object
    const selectedItem = notebookItems.find((item) => item.id === selectedItemId);

    // Keep strokesRef in sync with strokes state
    useEffect(() => {
        strokesRef.current = strokes;
    }, [strokes]);

    // Redraw function - replays all vector strokes onto canvas
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        ctx.clearRect(0, 0, width, height);

        const allStrokes = currentStrokeRef.current 
            ? [...strokesRef.current, currentStrokeRef.current] 
            : strokesRef.current;

        for (const stroke of allStrokes) {
            if (stroke.points.length === 0) continue;
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = stroke.size;

            if (stroke.isEraser) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = stroke.color;
            }

            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
        }

        ctx.globalCompositeOperation = 'source-over';
    }, []);

    // High-DPI & Responsive Window Resize Listener
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.resetTransform?.();
                ctx.scale(dpr, dpr);
            }
            redrawCanvas();
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [redrawCanvas]);

    // Redraw canvas whenever theme changes
    useEffect(() => {
        redrawCanvas();
    }, [activeTheme, redrawCanvas]);

    // MathJax Dynamic Script Loading & Typesetting
    useEffect(() => {
        if ((notebookItems.length > 0 || assistantResponse) && window.MathJax) {
            setTimeout(() => {
                if (window.MathJax.Hub) {
                    window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
                }
            }, 0);
        }
    }, [notebookItems, assistantResponse]);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            if (window.MathJax && window.MathJax.Hub) {
                window.MathJax.Hub.Config({
                    tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
                });
            }
        };

        return () => {
            document.head.removeChild(script);
        };
    }, []);

    // Unified Pointer Event Handlers
    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.setPointerCapture(e.pointerId);

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const isEraserMode = toolMode === TOOL_MODES.ERASER;
        const newStroke: Stroke = {
            points: [{ x, y }],
            color: isEraserMode ? 'rgba(0,0,0,1)' : color,
            size: strokeSize,
            isEraser: isEraserMode,
        };

        currentStrokeRef.current = newStroke;
        setIsDrawing(true);
        redrawCanvas();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !currentStrokeRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        currentStrokeRef.current.points.push({ x, y });
        redrawCanvas();
    };

    const finishStroke = (pointerId?: number) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (canvas && pointerId !== undefined && canvas.hasPointerCapture(pointerId)) {
            canvas.releasePointerCapture(pointerId);
        }

        if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
            const completedStroke = currentStrokeRef.current;
            currentStrokeRef.current = null;
            setStrokes((prev) => [...prev, completedStroke]);
            strokesRef.current = [...strokesRef.current, completedStroke];
            setRedoStack([]);
        } else {
            currentStrokeRef.current = null;
        }

        setIsDrawing(false);
        redrawCanvas();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        finishStroke(e.pointerId);
    };

    const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
        finishStroke(e.pointerId);
    };

    // Undo / Redo Actions
    const handleUndo = () => {
        if (strokes.length === 0) return;
        const lastStroke = strokes[strokes.length - 1];
        const updatedStrokes = strokes.slice(0, -1);
        setStrokes(updatedStrokes);
        strokesRef.current = updatedStrokes;
        setRedoStack((prev) => [...prev, lastStroke]);
        redrawCanvas();
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const restoredStroke = redoStack[redoStack.length - 1];
        const updatedRedoStack = redoStack.slice(0, -1);
        const updatedStrokes = [...strokes, restoredStroke];
        setStrokes(updatedStrokes);
        strokesRef.current = updatedStrokes;
        setRedoStack(updatedRedoStack);
        redrawCanvas();
    };

    // Clear Canvas Drawing
    const handleClearCanvas = () => {
        setStrokes([]);
        strokesRef.current = [];
        setRedoStack([]);
        currentStrokeRef.current = null;
        redrawCanvas();
    };

    // Full Application Reset
    const handleFullReset = () => {
        handleClearCanvas();
        setNotebookItems([]);
        setSelectedItemId(null);
        setDictOfVars({});
        setErrorMsg(null);
        setAssistantResponse(null);
    };

    // Dismiss single notebook item card
    const handleDismissItem = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setNotebookItems((prev) => prev.filter((item) => item.id !== id));
        if (selectedItemId === id) {
            setSelectedItemId(null);
        }
    };

    // Swatch Click
    const handleSelectColor = (swatchColor: string) => {
        setColor(swatchColor);
        setToolMode(TOOL_MODES.PENCIL);
    };

    // Generate Canvas Data URL export
    const getCanvasDataUrl = () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = width;
        exportCanvas.height = height;
        const exportCtx = exportCanvas.getContext('2d');

        if (exportCtx) {
            exportCtx.fillStyle = activeTheme.colors.canvasBg;
            exportCtx.fillRect(0, 0, width, height);

            for (const stroke of strokesRef.current) {
                if (stroke.points.length === 0) continue;
                exportCtx.beginPath();
                exportCtx.lineCap = 'round';
                exportCtx.lineJoin = 'round';
                exportCtx.lineWidth = stroke.size;

                if (stroke.isEraser) {
                    exportCtx.globalCompositeOperation = 'destination-out';
                } else {
                    exportCtx.globalCompositeOperation = 'source-over';
                    exportCtx.strokeStyle = stroke.color;
                }

                exportCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
                for (let i = 1; i < stroke.points.length; i++) {
                    exportCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
                }
                exportCtx.stroke();
            }
        }
        return exportCanvas.toDataURL('image/png');
    };

    // Submit / API Call for /calculate
    const runRoute = async () => {
        if (isLoading) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (strokesRef.current.length === 0 && !currentStrokeRef.current) {
            setErrorMsg("Please draw an equation or math problem on the canvas first.");
            return;
        }

        setIsLoading(true);
        setErrorMsg(null);

        try {
            const dataUrl = getCanvasDataUrl();

            const response = await axios({
                method: 'post',
                url: `${import.meta.env.VITE_API_URL || 'http://localhost:8900'}/calculate`,
                data: {
                    image: dataUrl,
                    dict_of_vars: dictOfVars,
                },
                timeout: 30000,
            });

            const resp = response.data;
            if (!resp || !resp.data || !Array.isArray(resp.data)) {
                throw new Error("Received an unexpected response format from the server.");
            }

            const updatedDict = { ...dictOfVars };
            resp.data.forEach((item: Response) => {
                if (item.assign) {
                    updatedDict[item.expr] = item.result;
                }
            });
            setDictOfVars(updatedDict);

            const dpr = window.devicePixelRatio || 1;
            let targetPos = { x: 10, y: 200 };

            const ctx = canvas.getContext('2d');
            if (ctx) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
                let foundPixel = false;

                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const i = (y * canvas.width + x) * 4;
                        if (imageData.data[i + 3] > 0) {
                            minX = Math.min(minX, x);
                            minY = Math.min(minY, y);
                            maxX = Math.max(maxX, x);
                            maxY = Math.max(maxY, y);
                            foundPixel = true;
                        }
                    }
                }

                if (foundPixel) {
                    targetPos = {
                        x: (minX + maxX) / (2 * dpr),
                        y: (minY + maxY) / (2 * dpr)
                    };
                }
            }

            const newItems: NotebookItem[] = resp.data.map((item: Response, idx: number) => ({
                id: `item-${Date.now()}-${idx}`,
                expression: item.expr,
                latex: `\\(\\LARGE{${item.expr} = ${item.result}}\\)` ,
                result: item.result,
                assign: item.assign,
                position: targetPos,
                selected: false
            }));

            // Replace old solution cards with active calculation so screen doesn't clutter
            setNotebookItems(newItems);
            if (newItems.length > 0) {
                setSelectedItemId(newItems[newItems.length - 1].id);
            }

        } catch (err: unknown) {
            console.error("Calculation Error:", err);
            const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
            const message = errorObj.response?.data?.message || errorObj.message || "Failed to solve equation. Please check server connectivity.";
            setErrorMsg(message);
        } finally {
            setIsLoading(false);
        }
    };

    // AI Assistant Action Click (/assistant endpoint)
    const handleAssistantAction = async (
        action: string, 
        customQuery?: string, 
        hintLevel: number = 1,
        userSolution?: string
    ) => {
        setIsAssistantOpen(true);
        setIsAssistantLoading(true);
        setErrorMsg(null);

        try {
            const dataUrl = strokesRef.current.length > 0 ? getCanvasDataUrl() : null;

            const response = await axios({
                method: 'post',
                url: `${import.meta.env.VITE_API_URL || 'http://localhost:8900'}/assistant`,
                data: {
                    image: dataUrl,
                    dict_of_vars: dictOfVars,
                    action: action,
                    selected_expression: selectedItem?.expression || null,
                    nearby_expressions: notebookItems.map((it) => it.expression),
                    user_query: customQuery || null,
                    user_solution: userSolution || null,
                    hint_level: hintLevel,
                    notebook_context: notebookItems.map((item) => ({ role: 'user', content: `${item.expression} = ${item.result}` }))
                },
                timeout: 30000,
            });

            if (response.data) {
                setAssistantResponse(response.data);
                if (action === 'visualize' && response.data.visualization?.available) {
                    setIsVisualizationVisible(true);
                }
            }
        } catch (err: unknown) {
            console.error("Assistant Error:", err);
            setErrorMsg("AI Assistant service timed out. Please try again.");
        } finally {
            setIsAssistantLoading(false);
        }
    };

    return (
        <div 
            className="relative w-screen h-screen overflow-hidden select-none transition-colors duration-300"
            style={{ backgroundColor: activeTheme.colors.background, color: activeTheme.colors.text }}
        >
            {/* Cinematic Background Motif Overlay with Automatic Handwriting Fade */}
            <ThemeBackgroundOverlay isDrawing={isDrawing} />

            {/* Top Navigation & Controls Toolbar */}
            <div 
                className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300"
                style={{ 
                    backgroundColor: `${activeTheme.colors.surface}f0`,
                    borderColor: activeTheme.colors.border 
                }}
            >
                {/* Left Tool Group: Reset, Clear, Undo, Redo */}
                <div className="flex items-center gap-1.5">
                    <Button
                        onClick={handleFullReset}
                        className="text-xs px-2.5 py-1.5 h-8 border min-h-[44px] transition-colors"
                        style={{ backgroundColor: activeTheme.colors.surfaceElevated, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }}
                        variant="default"
                        title="Reset canvas, variables, and solutions"
                    >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Reset
                    </Button>
                    <Button
                        onClick={handleClearCanvas}
                        className="text-xs px-2.5 py-1.5 h-8 border min-h-[44px] transition-colors"
                        style={{ backgroundColor: activeTheme.colors.surfaceElevated, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }}
                        variant="default"
                        title="Clear drawing canvas"
                    >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Clear
                    </Button>
                    <div className="h-5 w-px mx-1" style={{ backgroundColor: activeTheme.colors.border }} />
                    <Button
                        onClick={handleUndo}
                        disabled={strokes.length === 0}
                        className="text-xs px-2.5 py-1.5 h-8 border min-h-[44px] min-w-[44px] disabled:opacity-40"
                        style={{ backgroundColor: activeTheme.colors.surfaceElevated, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }}
                        variant="default"
                        title="Undo stroke"
                    >
                        <Undo className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        className="text-xs px-2.5 py-1.5 h-8 border min-h-[44px] min-w-[44px] disabled:opacity-40"
                        style={{ backgroundColor: activeTheme.colors.surfaceElevated, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }}
                        variant="default"
                        title="Redo stroke"
                    >
                        <Redo className="w-3.5 h-3.5" />
                    </Button>
                </div>

                {/* Center Tool Group: Pencil/Eraser & Size Controls */}
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center p-0.5 rounded-lg border" style={{ backgroundColor: activeTheme.colors.background, borderColor: activeTheme.colors.border }}>
                        <button
                            onClick={() => setToolMode(TOOL_MODES.PENCIL)}
                            className="flex items-center text-xs px-2.5 py-1 rounded-md transition-all min-h-[44px]"
                            style={toolMode === TOOL_MODES.PENCIL ? { backgroundColor: activeTheme.colors.primary, color: '#ffffff' } : { color: activeTheme.colors.textMuted }}
                            title="Pencil Tool"
                        >
                            <Pencil className="w-3.5 h-3.5 mr-1" />
                            Draw
                        </button>
                        <button
                            onClick={() => setToolMode(TOOL_MODES.ERASER)}
                            className="flex items-center text-xs px-2.5 py-1 rounded-md transition-all min-h-[44px]"
                            style={toolMode === TOOL_MODES.ERASER ? { backgroundColor: activeTheme.colors.primary, color: '#ffffff' } : { color: activeTheme.colors.textMuted }}
                            title="Eraser Tool"
                        >
                            <Eraser className="w-3.5 h-3.5 mr-1" />
                            Erase
                        </button>
                    </div>

                    <div className="h-5 w-px mx-1" style={{ backgroundColor: activeTheme.colors.border }} />

                    <div className="flex items-center p-0.5 rounded-lg border" style={{ backgroundColor: activeTheme.colors.background, borderColor: activeTheme.colors.border }}>
                        <button
                            onClick={() => setStrokeSize(STROKE_SIZES.SMALL)}
                            className="text-xs px-2 py-1 rounded-md transition-all min-h-[44px] min-w-[44px]"
                            style={strokeSize === STROKE_SIZES.SMALL ? { backgroundColor: activeTheme.colors.primary, color: '#ffffff' } : { color: activeTheme.colors.textMuted }}
                            title="Small Stroke (3px)"
                        >
                            S
                        </button>
                        <button
                            onClick={() => setStrokeSize(STROKE_SIZES.MEDIUM)}
                            className="text-xs px-2 py-1 rounded-md transition-all min-h-[44px] min-w-[44px]"
                            style={strokeSize === STROKE_SIZES.MEDIUM ? { backgroundColor: activeTheme.colors.primary, color: '#ffffff' } : { color: activeTheme.colors.textMuted }}
                            title="Medium Stroke (6px)"
                        >
                            M
                        </button>
                        <button
                            onClick={() => setStrokeSize(STROKE_SIZES.LARGE)}
                            className="text-xs px-2 py-1 rounded-md transition-all min-h-[44px] min-w-[44px]"
                            style={strokeSize === STROKE_SIZES.LARGE ? { backgroundColor: activeTheme.colors.primary, color: '#ffffff' } : { color: activeTheme.colors.textMuted }}
                            title="Large Stroke (12px)"
                        >
                            L
                        </button>
                    </div>
                </div>

                {/* Right Tool Group: Swatches, Theme Selector, AI Tutor & Run Action */}
                <div className="flex items-center gap-2">
                    <Group className="gap-1 p-1 rounded-lg border" style={{ backgroundColor: activeTheme.colors.background, borderColor: activeTheme.colors.border }}>
                        {SWATCHES.map((swatch) => (
                            <ColorSwatch
                                key={swatch}
                                color={swatch}
                                size={18}
                                className={`cursor-pointer transition-transform ${
                                    color === swatch && toolMode === TOOL_MODES.PENCIL
                                        ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-black'
                                        : 'hover:scale-110 opacity-80 hover:opacity-100'
                                }`}
                                onClick={() => handleSelectColor(swatch)}
                            />
                        ))}
                    </Group>

                    {/* Theme Selector Toggle Button */}
                    <Button
                        onClick={() => setIsThemeSelectorOpen(true)}
                        className="text-xs px-2.5 py-1.5 h-8 font-semibold border transition-all min-h-[44px]"
                        style={{ backgroundColor: activeTheme.colors.surfaceElevated, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }}
                        variant="default"
                        title="Change Visual Theme"
                    >
                        <Palette className="w-3.5 h-3.5 mr-1" style={{ color: activeTheme.colors.accent }} />
                        Theme
                    </Button>

                    {/* AI Assistant Drawer Toggle Button */}
                    <Button
                        onClick={() => {
                            setIsAssistantOpen(!isAssistantOpen);
                            if (!assistantResponse) {
                                handleAssistantAction('solve');
                            }
                        }}
                        className="text-xs px-3 py-1.5 h-8 font-semibold border transition-all min-h-[44px]"
                        style={isAssistantOpen ? { backgroundColor: activeTheme.colors.accent, borderColor: activeTheme.colors.primary, color: '#ffffff' } : { backgroundColor: activeTheme.colors.surfaceElevated, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }}
                        variant="default"
                    >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 fill-current" />
                        AI Tutor
                    </Button>

                    <Button
                        onClick={runRoute}
                        disabled={isLoading}
                        className="text-xs px-4 py-1.5 h-8 font-semibold shadow-lg border disabled:opacity-50 min-h-[44px]"
                        style={{ backgroundColor: activeTheme.colors.primary, borderColor: activeTheme.colors.primary, color: '#ffffff' }}
                        variant="default"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                Solving...
                            </>
                        ) : (
                            <>
                                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                                Run
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* User Error Banner */}
            {errorMsg && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 bg-red-900/90 border border-red-700 text-red-100 text-xs rounded-lg shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
                    <span>{errorMsg}</span>
                    <button
                        onClick={() => setErrorMsg(null)}
                        className="ml-2 p-0.5 hover:bg-red-800 rounded transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Drawing Surface */}
            <canvas
                ref={canvasRef}
                id="canvas"
                className="absolute top-0 left-0 w-full h-full cursor-crosshair z-10"
                style={{ touchAction: 'none', backgroundColor: 'transparent' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onPointerLeave={handlePointerUp}
            />

            {/* Draggable & Selectable Notebook Math Cards with Close Dismiss Button */}
            {notebookItems && notebookItems.map((item) => (
                <Draggable
                    key={item.id}
                    defaultPosition={item.position}
                    onStop={(_, data) => {
                        setNotebookItems((prev) =>
                            prev.map((it) => (it.id === item.id ? { ...it, position: { x: data.x, y: data.y } } : it))
                        );
                    }}
                >
                    <div
                        onClick={() => setSelectedItemId(item.id)}
                        className="absolute p-3 pr-8 rounded-xl shadow-2xl backdrop-blur-md cursor-grab active:cursor-grabbing z-20 transition-all border"
                        style={{
                            backgroundColor: `${activeTheme.colors.surface}f0`,
                            borderColor: selectedItemId === item.id ? activeTheme.colors.primary : activeTheme.colors.border,
                            boxShadow: selectedItemId === item.id ? `0 0 15px ${activeTheme.colors.glow}` : undefined
                        }}
                    >
                        <button
                            onClick={(e) => handleDismissItem(item.id, e)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-lg transition-colors"
                            style={{ color: activeTheme.colors.textMuted }}
                            title="Dismiss card"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="latex-content text-base font-semibold" style={{ color: activeTheme.colors.text }}>{item.latex}</div>
                    </div>
                </Draggable>
            ))}

            {/* Touch Contextual Floating Action Bar for Selected Expression */}
            {selectedItem && (
                <ContextualActionBar
                    selectedExpression={selectedItem.expression}
                    position={selectedItem.position}
                    onAction={(action) => handleAssistantAction(action)}
                    onClose={() => setSelectedItemId(null)}
                />
            )}

            {/* Theme Selector Modal */}
            <ThemeSelector
                isOpen={isThemeSelectorOpen}
                onClose={() => setIsThemeSelectorOpen(false)}
            />

            {/* AI Assistant Drawer Panel */}
            <AssistantPanel
                isOpen={isAssistantOpen}
                onClose={() => setIsAssistantOpen(false)}
                response={assistantResponse}
                isLoading={isAssistantLoading}
                selectedExpression={selectedItem?.expression}
                onActionClick={handleAssistantAction}
                onViewVisualization={() => setIsVisualizationVisible(true)}
            />

            {/* Visualization Modal */}
            {isVisualizationVisible && assistantResponse?.visualization && (
                <VisualizationViewer
                    spec={assistantResponse.visualization}
                    onClose={() => setIsVisualizationVisible(false)}
                />
            )}
        </div>
    );
}
