// ==========================================================================
// Kociemba standard Face Order & index mappings
// ==========================================================================

export const FACE_ORDER = ['U', 'L', 'F', 'R', 'B', 'D'];

export const FACELET_OFFSET = {
    'U': 0,
    'R': 9,
    'F': 18,
    'D': 27,
    'L': 36,
    'B': 45
};

// High-contrast Rubik's colors mapping
export const COLOR_HEX_MAP = {
    'U': '#ffffff', // White (Up)
    'L': '#f97316', // Orange (Left)
    'F': '#10b981', // Green (Front)
    'R': '#ef4444', // Red (Right)
    'B': '#2563eb', // Blue (Back)
    'D': '#ffea00', // Yellow (Down)
    'X': '#0f172a'  // Internal structural color (Dark Slate)
};

// Pyraminx facelet-to-solver index mappings
// Each sub-array maps 9 visual SVG triangle positions to solver state indices.
// Visual layout: [0]=apex, [1]=mid-left, [2]=mid-center, [3]=mid-right,
//                [4]=bot-left, [5]=bot-left-center, [6]=bot-center, [7]=bot-right-center, [8]=bot-right
export const PYRAMINX_FACE_MAPPINGS = [
    [0, 3, 2, 1, 8, 7, 6, 5, 4],          // Face U (0): apex=B, bot-left=R, bot-right=L
    [13, 10, 14, 15, 9, 11, 12, 16, 17],   // Face L (1): apex=B, top-left=U, top-right=R
    [26, 24, 25, 21, 22, 23, 19, 20, 18],  // Face R (2): apex=B, top-left=L, top-right=U
    [31, 33, 32, 28, 35, 34, 30, 29, 27]   // Face B (3): apex=L, top-left=R, top-right=U
];

// Global reactive state of the Rubik's Cube
export const state = {
    puzzleType: 'cube',     // 'cube' or 'pyraminx'
    cubeState: [],          // Array of 54 characters (e.g. ['U', 'U', ...])
    activeColor: 'U',       // Currently selected color in the 2D palette
    isAnimating: false,     // Mutex to block animations overlapping
    solutionMoves: [],      // Chronological moves (e.g. ["R", "U2", "F'"])
    currentMoveIndex: -1    // Player timeline cursor position
};
