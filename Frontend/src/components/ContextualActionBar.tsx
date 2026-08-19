import React from 'react';
import { Sparkles, BookOpen, Lightbulb, CheckCircle2, Eye, RefreshCw } from 'lucide-react';

interface ContextualActionBarProps {
    selectedExpression: string;
    position: { x: number; y: number };
    onAction: (action: string) => void;
    onClose: () => void;
}

export const ContextualActionBar: React.FC<ContextualActionBarProps> = ({
    selectedExpression,
    position,
    onAction,
}) => {
    if (!selectedExpression) return null;

    return (
        <div
            className="absolute z-30 flex flex-wrap items-center gap-1.5 p-1.5 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/80 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            style={{
                left: `${Math.max(10, Math.min(position.x, window.innerWidth - 340))}px`,
                top: `${Math.max(70, position.y - 65)}px`,
            }}
        >
            <button
                onClick={() => onAction('solve')}
                className="flex items-center gap-1 text-xs px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/40 active:scale-95 text-emerald-300 border border-emerald-500/40 rounded-xl font-medium min-h-[44px] transition-all"
                title="Solve step-by-step"
            >
                <Sparkles className="w-4 h-4" />
                <span>Solve</span>
            </button>
            <button
                onClick={() => onAction('explain')}
                className="flex items-center gap-1 text-xs px-3 py-2 bg-sky-600/30 hover:bg-sky-600/40 active:scale-95 text-sky-300 border border-sky-500/40 rounded-xl font-medium min-h-[44px] transition-all"
                title="Explain concepts"
            >
                <BookOpen className="w-4 h-4" />
                <span>Explain</span>
            </button>
            <button
                onClick={() => onAction('hint')}
                className="flex items-center gap-1 text-xs px-3 py-2 bg-amber-600/30 hover:bg-amber-600/40 active:scale-95 text-amber-300 border border-amber-500/40 rounded-xl font-medium min-h-[44px] transition-all"
                title="Get a hint"
            >
                <Lightbulb className="w-4 h-4" />
                <span>Hint</span>
            </button>
            <button
                onClick={() => onAction('verify')}
                className="flex items-center gap-1 text-xs px-3 py-2 bg-purple-600/30 hover:bg-purple-600/40 active:scale-95 text-purple-300 border border-purple-500/40 rounded-xl font-medium min-h-[44px] transition-all"
                title="Verify my answer"
            >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify</span>
            </button>
            <button
                onClick={() => onAction('visualize')}
                className="flex items-center gap-1 text-xs px-3 py-2 bg-teal-600/30 hover:bg-teal-600/40 active:scale-95 text-teal-300 border border-teal-500/40 rounded-xl font-medium min-h-[44px] transition-all"
                title="Visualize plot"
            >
                <Eye className="w-4 h-4" />
                <span>Visualize</span>
            </button>
            <button
                onClick={() => onAction('alternative')}
                className="flex items-center gap-1 text-xs px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/40 active:scale-95 text-indigo-300 border border-indigo-500/40 rounded-xl font-medium min-h-[44px] transition-all"
                title="Alternative method"
            >
                <RefreshCw className="w-4 h-4" />
                <span>Alt</span>
            </button>
        </div>
    );
};
