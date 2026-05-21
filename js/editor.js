import { FACE_ORDER, state } from './constants.js';
import { build3DCube, extract2DStateFrom3D } from './visualizer.js';
import { applyMoveInstantly3D } from './rotations.js';
import { showSolution } from './player.js';
import { t } from './i18n.js';

/**
 * Initializes the color palette and action buttons
 */
export function initEditorControls() {
    // 1. Setup Color Palette Click Events
    const paletteButtons = document.querySelectorAll(".color-btn");
    paletteButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            paletteButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.activeColor = btn.dataset.color;
        });
    });

    // 3. Setup Reset Button
    document.getElementById("btn-reset").addEventListener("click", () => {
        resetCubeToSolved();
        // Clear any solution active playback
        stopActivePlayback();
    });

    // 3. Setup Scramble Button
    document.getElementById("btn-random").addEventListener("click", () => {
        generateRandomValidState();
        stopActivePlayback();
    });

    // 5. Initial load: Set cube to solved state
    resetCubeToSolved();
}


/**
 * Helper to reset the active steps timeline when configuration changes
 */
function stopActivePlayback() {
    showSolution("", 0);
}

/**
 * Resets the internal state to a solved Rubik's Cube configuration
 */
export function resetCubeToSolved() {
    const solvedString = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
    state.cubeState = solvedString.split('');

    build3DCube(); // Completely rebuild 3D meshes to clear rotations
    validateCube();
}



/**
 * Validates the current cube color configuration in real-time
 */
export function validateCube() {
    const counts = { 'U': 0, 'L': 0, 'F': 0, 'R': 0, 'B': 0, 'D': 0 };
    state.cubeState.forEach(char => {
        if (counts[char] !== undefined) counts[char]++;
    });

    const validationBox = document.getElementById("validation-box");
    const validationMsg = document.getElementById("validation-message");
    const solveBtn = document.getElementById("btn-solve");

    // Check if there are exactly 9 facelets of each color
    let isValid = true;
    const errors = [];

    FACE_ORDER.forEach(faceChar => {
        const count = counts[faceChar];
        if (count !== 9) {
            isValid = false;
            const faceName = t(`face-${faceChar.toLowerCase()}`);
            errors.push(`${faceName}: ${count}/9 ${t('squares')}`);
        }
    });

    if (isValid) {
        validationBox.className = "validation-box success";
        validationMsg.textContent = t('wasm-ready');
        solveBtn.disabled = false;
    } else {
        validationBox.className = "validation-box warning";
        validationMsg.textContent = `${t('invalid-counts')}${errors.join(', ')}`;
        solveBtn.disabled = true;
    }
}



/**
 * Scrambles the cube using physical moves to guarantee mathematical solvability
 */
export function generateRandomValidState() {
    // 1. Start from a clean solved state
    const solved = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
    state.cubeState = solved.split('');
    build3DCube(); 

    // 2. Generate random sequence of moves and rotate physical 3D cubies instantly
    const moves = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2'];
    const scrambleLength = 20 + Math.floor(Math.random() * 10); // 20-30 moves

    for (let s = 0; s < scrambleLength; s++) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        applyMoveInstantly3D(randomMove);
    }

    // 3. Extract the resulting 2D state from the physical 3D positions
    extract2DStateFrom3D();
    validateCube();
}
