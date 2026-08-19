import { AssistantResponse } from '@/components/AssistantPanel';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    response?: AssistantResponse;
}

export interface Conversation {
    id: string;
    title: string;
    created_at: number;
    updated_at: number;
    messages: ChatMessage[];
}

const STORAGE_KEY = 'ipad_math_notebook_conversations';

export const getStoredConversations = (): Conversation[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
};

export const saveConversations = (conversations: Conversation[]): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
        console.error("Failed to persist conversation history to localStorage:", e);
    }
};

export const generateConversationTitle = (firstMessage: string): string => {
    if (!firstMessage) return 'New Math Problem';

    const msg = firstMessage.trim();
    if (msg.toLowerCase().includes('derivative') || msg.toLowerCase().includes('d/dx')) return 'Calculus — Derivative';
    if (msg.toLowerCase().includes('integral') || msg.toLowerCase().includes('\\int') || msg.includes('∫')) return 'Calculus — Integration';
    if (msg.toLowerCase().includes('gradient') || msg.toLowerCase().includes('\\nabla')) return 'Multivariable Gradient';
    if (msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('\\lim')) return 'Limits Practice';
    if (msg.includes('^2') || msg.includes('x²')) return 'Quadratic Equation';

    return msg.length > 25 ? msg.substring(0, 22) + '...' : msg;
};

export const createNewConversation = (initialTitle?: string): Conversation => {
    const newConv: Conversation = {
        id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: initialTitle || 'New Conversation',
        created_at: Date.now(),
        updated_at: Date.now(),
        messages: []
    };

    const convs = getStoredConversations();
    saveConversations([newConv, ...convs]);
    return newConv;
};

export const addMessageToConversation = (
    conversationId: string,
    message: ChatMessage
): Conversation[] => {
    const convs = getStoredConversations();
    const idx = convs.findIndex(c => c.id === conversationId);

    if (idx !== -1) {
        convs[idx].messages.push(message);
        convs[idx].updated_at = Date.now();
        if (convs[idx].messages.length === 1 && message.content) {
            convs[idx].title = generateConversationTitle(message.content);
        }
        saveConversations(convs);
    }

    return convs;
};

export const deleteConversation = (conversationId: string): Conversation[] => {
    const convs = getStoredConversations();
    const filtered = convs.filter(c => c.id !== conversationId);
    saveConversations(filtered);
    return filtered;
};
