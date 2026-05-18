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
    'U': '#ffffff', // White
    'L': '#f97316', // Orange
    'F': '#10b981', // Green
    'R': '#ef4444', // Red
    'B': '#2563eb', // Blue
    'D': '#ffea00', // Yellow
    'X': '#0f172a'  // Internal structural color (Dark Slate)
};

// Global reactive state of the Rubik's Cube
export const state = {
    cubeState: [],          // Array of 54 characters (e.g. ['U', 'U', ...])
    activeColor: 'U',       // Currently selected color in the 2D palette
    isAnimating: false,     // Mutex to block animations overlapping
    solutionMoves: [],      // Chronological moves (e.g. ["R", "U2", "F'"])
    currentMoveIndex: -1    // Player timeline cursor position
};
