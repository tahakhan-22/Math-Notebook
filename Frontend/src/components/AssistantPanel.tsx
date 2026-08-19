import React, { useState, useEffect } from 'react';
import { 
    X, 
    Sparkles, 
    Lightbulb, 
    CheckCircle2, 
    XCircle,
    Eye, 
    BookOpen, 
    RefreshCw, 
    HelpCircle, 
    Send,
    Loader2,
    ChevronRight,
    Plus,
    MessageSquare,
    Trash2,
    History
} from 'lucide-react';
import { 
    Conversation, 
    getStoredConversations, 
    createNewConversation, 
    addMessageToConversation, 
    deleteConversation 
} from '@/utils/chatHistory';
import { useTheme } from '@/themes/ThemeContext';

export interface StepItem {
    step: number;
    title: string;
    explanation: string;
    math: string;
    display_math?: string;
}

export interface SecondaryExpression {
    expression: string;
    label?: string;
}

export interface VisualizationSpec {
    available: boolean;
    type: string;
    instructions: {
        expression?: string;
        secondary_expressions?: SecondaryExpression[];
        x_range?: [number, number];
        y_range?: [number, number];
        annotations?: Array<{ type: string; x: number; y?: number; label?: string }>;
    };
}

export interface AssistantResponse {
    problem: string;
    problem_type: string;
    topic: string;
    confidence: number;
    answer: string;
    verification_status?: string;
    steps: StepItem[];
    method: string;
    alternative_methods?: string[];
    visualization: VisualizationSpec;
    follow_up_context?: string;
    warnings?: string[];
}

interface AssistantPanelProps {
    isOpen: boolean;
    onClose: () => void;
    response: AssistantResponse | null;
    isLoading: boolean;
    selectedExpression?: string;
    onActionClick: (action: string, customQuery?: string, hintLevel?: number, userSolution?: string) => void;
    onViewVisualization: () => void;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
    isOpen,
    onClose,
    response,
    isLoading,
    selectedExpression,
    onActionClick,
    onViewVisualization
}) => {
    const { activeTheme } = useTheme();
    const [query, setQuery] = useState('');
    const [userSolution, setUserSolution] = useState('');
    const [hintLevel, setHintLevel] = useState(1);
    const [activeMode, setActiveMode] = useState<string>('solve');

    // Conversation History State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

    const assistantTitle = activeTheme.assistantStyle?.avatarTitle || 'AI Math Tutor';

    useEffect(() => {
        const stored = getStoredConversations();
        setConversations(stored);
        if (stored.length > 0 && !activeConvId) {
            setActiveConvId(stored[0].id);
        } else if (stored.length === 0) {
            const initial = createNewConversation('Calculus & Algebra Tutor');
            setConversations([initial]);
            setActiveConvId(initial.id);
        }
    }, [activeConvId]);

    // Whenever a new assistant response arrives, record it in current conversation
    useEffect(() => {
        if (response && activeConvId) {
            const msg = {
                id: `msg-${Date.now()}`,
                role: 'assistant' as const,
                content: response.answer || response.problem,
                timestamp: Date.now(),
                response: response
            };
            const updated = addMessageToConversation(activeConvId, msg);
            setConversations(updated);
        }
    }, [response, activeConvId]);

    if (!isOpen) return null;

    const activeConv = conversations.find(c => c.id === activeConvId);

    const handleNewChat = () => {
        const newConv = createNewConversation();
        setConversations(getStoredConversations());
        setActiveConvId(newConv.id);
        setIsHistoryDrawerOpen(false);
    };

    const handleDeleteChat = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = deleteConversation(id);
        setConversations(updated);
        if (activeConvId === id) {
            setActiveConvId(updated.length > 0 ? updated[0].id : null);
        }
    };

    const handleSendQuery = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || isLoading) return;

        if (activeConvId) {
            const userMsg = {
                id: `msg-${Date.now()}`,
                role: 'user' as const,
                content: query.trim(),
                timestamp: Date.now()
            };
            addMessageToConversation(activeConvId, userMsg);
            setConversations(getStoredConversations());
        }

        onActionClick('solve', query.trim());
        setQuery('');
    };

    const handleVerifySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userSolution.trim() || isLoading) return;
        onActionClick('verify', undefined, 1, userSolution.trim());
    };

    const handleGetAnotherHint = () => {
        const nextLevel = hintLevel + 1;
        setHintLevel(nextLevel);
        onActionClick('hint', undefined, nextLevel);
    };

    return (
        <div 
            className="fixed bottom-0 right-0 sm:top-16 sm:right-3 sm:bottom-3 z-40 w-full sm:max-w-md max-h-[85vh] sm:max-h-none border-t sm:border rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-right-4 duration-300 transition-colors"
            style={{ backgroundColor: activeTheme.colors.surface, borderColor: activeTheme.colors.border }}
        >
            {/* Top Assistant Header with Conversation History Toggle & Cinematic Avatar Title */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: activeTheme.colors.background, borderColor: activeTheme.colors.border }}>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors"
                        style={{ color: activeTheme.colors.accent }}
                        title="View Conversation History"
                    >
                        <History className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: activeTheme.colors.primary }} />
                            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: activeTheme.colors.text }}>
                                {assistantTitle}
                            </h3>
                        </div>
                        <p className="text-[10px]" style={{ color: activeTheme.colors.textMuted }}>
                            {activeConv ? activeConv.title : selectedExpression ? `Selected: ${selectedExpression}` : 'Contextual Notebook Companion'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleNewChat}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors"
                        style={{ color: activeTheme.colors.primary }}
                        title="New Conversation"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors"
                        style={{ color: activeTheme.colors.textMuted }}
                        title="Close Assistant"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Conversation Drawer Overlay */}
            {isHistoryDrawerOpen && (
                <div className="absolute inset-0 z-50 p-4 flex flex-col space-y-3 animate-in fade-in duration-200" style={{ backgroundColor: activeTheme.colors.background }}>
                    <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: activeTheme.colors.border }}>
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: activeTheme.colors.text }}>Recent Conversations</span>
                        <button
                            onClick={() => setIsHistoryDrawerOpen(false)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            style={{ color: activeTheme.colors.textMuted }}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={handleNewChat}
                        className="w-full py-2.5 px-3 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                        style={{ backgroundColor: activeTheme.colors.primary, color: '#ffffff' }}
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Chat Session</span>
                    </button>

                    <div className="flex-1 overflow-y-auto space-y-2 pt-1">
                        {conversations.map((conv) => (
                            <div
                                key={conv.id}
                                onClick={() => { setActiveConvId(conv.id); setIsHistoryDrawerOpen(false); }}
                                className="p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all"
                                style={{
                                    backgroundColor: activeConvId === conv.id ? activeTheme.colors.surfaceElevated : activeTheme.colors.surface,
                                    borderColor: activeConvId === conv.id ? activeTheme.colors.primary : activeTheme.colors.border,
                                    color: activeTheme.colors.text
                                }}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <MessageSquare className="w-4 h-4 shrink-0" style={{ color: activeTheme.colors.accent }} />
                                    <span className="text-xs truncate">{conv.title}</span>
                                </div>
                                <button
                                    onClick={(e) => handleDeleteChat(conv.id, e)}
                                    className="p-1 transition-colors"
                                    style={{ color: activeTheme.colors.textMuted }}
                                    title="Delete Conversation"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Touch Action Palette */}
            <div className="p-2.5 border-b flex flex-wrap gap-1.5 overflow-x-auto" style={{ backgroundColor: activeTheme.colors.background, borderColor: activeTheme.colors.border }}>
                <button
                    onClick={() => { setActiveMode('solve'); onActionClick('solve'); }}
                    className="flex items-center text-xs px-3 py-2 border rounded-xl font-medium min-h-[44px] transition-all"
                    style={{ backgroundColor: `${activeTheme.colors.primary}20`, borderColor: `${activeTheme.colors.primary}50`, color: activeTheme.colors.primary }}
                >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Solve
                </button>
                <button
                    onClick={() => { setActiveMode('explain'); onActionClick('explain'); }}
                    className="flex items-center text-xs px-3 py-2 border rounded-xl font-medium min-h-[44px] transition-all"
                    style={{ backgroundColor: `${activeTheme.colors.secondary}20`, borderColor: `${activeTheme.colors.secondary}50`, color: activeTheme.colors.secondary }}
                >
                    <BookOpen className="w-3.5 h-3.5 mr-1" />
                    Explain
                </button>
                <button
                    onClick={() => { setActiveMode('hint'); setHintLevel(1); onActionClick('hint', undefined, 1); }}
                    className="flex items-center text-xs px-3 py-2 border rounded-xl font-medium min-h-[44px] transition-all"
                    style={{ backgroundColor: `${activeTheme.colors.accent}20`, borderColor: `${activeTheme.colors.accent}50`, color: activeTheme.colors.accent }}
                >
                    <Lightbulb className="w-3.5 h-3.5 mr-1" />
                    Hint
                </button>
                <button
                    onClick={() => { setActiveMode('verify'); }}
                    className="flex items-center text-xs px-3 py-2 border rounded-xl font-medium min-h-[44px] transition-all"
                    style={{ backgroundColor: `${activeTheme.colors.primary}20`, borderColor: `${activeTheme.colors.primary}50`, color: activeTheme.colors.primary }}
                >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Verify
                </button>
                <button
                    onClick={() => { setActiveMode('visualize'); onActionClick('visualize'); }}
                    className="flex items-center text-xs px-3 py-2 border rounded-xl font-medium min-h-[44px] transition-all"
                    style={{ backgroundColor: `${activeTheme.colors.accent}20`, borderColor: `${activeTheme.colors.accent}50`, color: activeTheme.colors.accent }}
                >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Visualize
                </button>
                <button
                    onClick={() => { setActiveMode('alternative'); onActionClick('alternative'); }}
                    className="flex items-center text-xs px-3 py-2 border rounded-xl font-medium min-h-[44px] transition-all"
                    style={{ backgroundColor: `${activeTheme.colors.secondary}20`, borderColor: `${activeTheme.colors.secondary}50`, color: activeTheme.colors.secondary }}
                >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Alternative
                </button>
            </div>

            {/* Verify Solution Input Form */}
            {activeMode === 'verify' && (
                <form onSubmit={handleVerifySubmit} className="p-3 border-b flex flex-col gap-2" style={{ backgroundColor: activeTheme.colors.background, borderColor: activeTheme.colors.border }}>
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: activeTheme.colors.accent }}>
                        Enter Your Solution To Verify:
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={userSolution}
                            onChange={(e) => setUserSolution(e.target.value)}
                            placeholder="e.g. 2x sin(x) + x^2 cos(x)"
                            className="flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none"
                            style={{ backgroundColor: activeTheme.colors.surfaceElevated, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }}
                        />
                        <button
                            type="submit"
                            disabled={!userSolution.trim() || isLoading}
                            className="px-3 py-2 text-white text-xs font-semibold rounded-xl transition-all"
                            style={{ backgroundColor: activeTheme.colors.primary }}
                        >
                            Check
                        </button>
                    </div>
                </form>
            )}

            {/* Scrollable Content Walkthrough Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs" style={{ color: activeTheme.colors.text }}>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ color: activeTheme.colors.textMuted }}>
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: activeTheme.colors.primary }} />
                        <p className="text-xs font-medium">Analyzing mathematical structure & reasoning...</p>
                    </div>
                ) : response ? (
                    <>
                        {/* Header Badges & Verification Badge */}
                        <div className="flex items-center justify-between text-[11px] pb-2 border-b" style={{ borderColor: activeTheme.colors.border, color: activeTheme.colors.textMuted }}>
                            <span className="capitalize px-2 py-0.5 rounded-md font-mono" style={{ backgroundColor: activeTheme.colors.surfaceElevated, color: activeTheme.colors.accent }}>
                                {response.topic || response.problem_type}
                            </span>
                            
                            {response.verification_status === 'correct' && (
                                <span className="flex items-center gap-1 px-2.5 py-0.5 border text-emerald-300 font-bold rounded-full" style={{ backgroundColor: `${activeTheme.colors.primary}20`, borderColor: activeTheme.colors.primary }}>
                                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: activeTheme.colors.primary }} /> Correct!
                                </span>
                            )}
                            {response.verification_status === 'incorrect' && (
                                <span className="flex items-center gap-1 px-2.5 py-0.5 border text-red-300 font-bold rounded-full bg-red-950 border-red-500/50">
                                    <XCircle className="w-3.5 h-3.5 text-red-400" /> Not quite
                                </span>
                            )}

                            {response.visualization?.available && (
                                <button
                                    onClick={onViewVisualization}
                                    className="flex items-center underline font-medium"
                                    style={{ color: activeTheme.colors.accent }}
                                >
                                    <Eye className="w-3.5 h-3.5 mr-1" /> View Plot
                                </button>
                            )}
                        </div>

                        {/* Final Answer Banner */}
                        {response.answer && (
                            <div className="p-3 border rounded-xl" style={{ backgroundColor: `${activeTheme.colors.primary}15`, borderColor: activeTheme.colors.primary }}>
                                <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: activeTheme.colors.accent }}>
                                    Final Answer
                                </span>
                                <div className="text-sm font-semibold font-mono" style={{ color: activeTheme.colors.text }}>
                                    {`\\(${response.answer}\\)`}
                                </div>
                            </div>
                        )}

                        {/* Step Walkthrough */}
                        {response.steps && response.steps.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: activeTheme.colors.textMuted }}>
                                    Step-by-Step Walkthrough
                                </h4>
                                {response.steps.map((st) => (
                                    <div key={st.step} className="p-3 border rounded-xl space-y-1.5 shadow-sm" style={{ backgroundColor: activeTheme.colors.background, borderColor: activeTheme.colors.border }}>
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold" style={{ backgroundColor: `${activeTheme.colors.primary}30`, color: activeTheme.colors.primary }}>
                                                {st.step}
                                            </span>
                                            <span className="font-semibold" style={{ color: activeTheme.colors.text }}>{st.title}</span>
                                        </div>
                                        <p className="text-xs leading-relaxed" style={{ color: activeTheme.colors.textMuted }}>{st.explanation}</p>
                                        {(st.display_math || st.math) && (
                                            <div className="mt-1 p-2 rounded-lg font-mono text-xs overflow-x-auto" style={{ backgroundColor: activeTheme.colors.surfaceElevated, color: activeTheme.colors.accent }}>
                                                {`\\(${st.display_math || st.math}\\)`}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Progressive Hint Reveal Button */}
                        {activeMode === 'hint' && (
                            <button
                                onClick={handleGetAnotherHint}
                                className="w-full py-2.5 border font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                                style={{ backgroundColor: `${activeTheme.colors.accent}20`, borderColor: activeTheme.colors.accent, color: activeTheme.colors.accent }}
                            >
                                <span>Get Another Hint (Level {hintLevel + 1})</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}

                        {/* Follow up Verification Note */}
                        {response.follow_up_context && (
                            <div className="p-2.5 border rounded-lg text-[11px]" style={{ backgroundColor: activeTheme.colors.background, borderColor: activeTheme.colors.border, color: activeTheme.colors.textMuted }}>
                                {response.follow_up_context}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center gap-2" style={{ color: activeTheme.colors.textMuted }}>
                        <HelpCircle className="w-8 h-8 stroke-1" />
                        <p className="text-xs">Draw or select a math problem on the notebook canvas, then click an action above.</p>
                    </div>
                )}
            </div>

            {/* Mobile Keyboard-Friendly Follow-up Query Form */}
            <form onSubmit={handleSendQuery} className="p-3 border-t flex items-center gap-2" style={{ backgroundColor: activeTheme.colors.background, borderColor: activeTheme.colors.border }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask a follow-up question..."
                    className="flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    style={{ backgroundColor: activeTheme.colors.surfaceElevated, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }}
                />
                <button
                    type="submit"
                    disabled={!query.trim() || isLoading}
                    className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-white rounded-xl transition-all disabled:opacity-40"
                    style={{ backgroundColor: activeTheme.colors.primary }}
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
};
