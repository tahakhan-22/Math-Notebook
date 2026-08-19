export interface NotebookItem {
    id: string;
    expression: string;
    latex?: string;
    result?: string | number;
    assign?: boolean;
    position: {
        x: number;
        y: number;
    };
    type?: string;
    selected?: boolean;
}
