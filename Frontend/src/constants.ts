const SWATCHES = [
    "#000000",  // black
    "#ffffff",  // white
    "#ee3333",  // red
    "#e64980",  // pink
    "#be4bdb",  // purple
    "#893200",  // brown
    "#228be6",  // blue
    "#3333ee",  // dark blue
    "#40c057",  // green
    "#00aa00",  // dark green
    "#fab005",  // yellow
    "#fd7e14",  // orange
];

const STROKE_SIZES = {
    SMALL: 3,
    MEDIUM: 6,
    LARGE: 12,
} as const;

const TOOL_MODES = {
    PENCIL: 'pencil',
    ERASER: 'eraser',
} as const;

export { SWATCHES, STROKE_SIZES, TOOL_MODES };