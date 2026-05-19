import { FACE_ORDER, FACELET_OFFSET, state } from './constants.js';
import { build3DCube, update3DCubeColors, extract2DStateFrom3D } from './visualizer.js';
import { applyMoveInstantly3D } from './rotations.js';
import { showSolution } from './player.js';
import { t } from './i18n.js';

/**
 * Initializes the 2D Net Editor, color palette and action buttons
 */
export function init2DNet() {
    // 1. Setup Color Palette Click Events
    const paletteButtons = document.querySelectorAll(".color-btn");
    paletteButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            paletteButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.activeColor = btn.dataset.color;
        });
    });

    // 2. Setup Face Selector Tabs
    const faceTabs = document.querySelectorAll(".face-tab");
    faceTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            // Update Active Tab Button
            faceTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            // Update Active Face in the Net
            const selectedFace = tab.dataset.face;
            const faces = document.querySelectorAll(".face");
            faces.forEach(f => {
                f.classList.remove("active-face");
                if (f.classList.contains(`face-${selectedFace}`)) {
                    f.classList.add("active-face");
                }
            });
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

    // 4. Setup View Mode Toggle (Single vs Unfolded)
    const btnSingle = document.getElementById("btn-view-single");
    const btnUnfolded = document.getElementById("btn-view-unfolded");
    if (btnSingle && btnUnfolded) {
        btnSingle.addEventListener("click", () => setViewMode("single"));
        btnUnfolded.addEventListener("click", () => setViewMode("unfolded"));
    }

    // Determine initial view mode
    const savedMode = localStorage.getItem("cube-solver-view-mode");
    const initialMode = savedMode || (window.innerWidth <= 576 ? "single" : "unfolded");
    setViewMode(initialMode);

    // 5. Initial load: Set cube to solved state
    resetCubeToSolved();
}

/**
 * Switch view mode of the 2D Net editor
 */
export function setViewMode(mode) {
    const net = document.getElementById("cube-net");
    const faceGroup = document.getElementById("face-selector-group");
    const btnSingle = document.getElementById("btn-view-single");
    const btnUnfolded = document.getElementById("btn-view-unfolded");

    if (!net || !btnSingle || !btnUnfolded) return;

    if (mode === "unfolded") {
        net.classList.remove("single-face-mode");
        net.classList.add("unfolded-mode");
        if (faceGroup) faceGroup.classList.add("hidden-view");
        
        btnSingle.classList.remove("active");
        btnUnfolded.classList.add("active");
    } else {
        net.classList.remove("unfolded-mode");
        net.classList.add("single-face-mode");
        if (faceGroup) faceGroup.classList.remove("hidden-view");
        
        btnUnfolded.classList.remove("active");
        btnSingle.classList.add("active");
    }
    localStorage.setItem("cube-solver-view-mode", mode);
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

    render2DNet();
    build3DCube(); // Completely rebuild 3D meshes to clear rotations
    validateCube();
}

/**
 * Dynamically renders the 9 interactive buttons inside each of the 6 faces
 */
export function render2DNet() {
    FACE_ORDER.forEach(faceName => {
        const faceContainer = document.querySelector(`.face-${faceName.toLowerCase()}`);
        if (!faceContainer) return;

        faceContainer.innerHTML = ''; // Clear previous facelets
        const offset = FACELET_OFFSET[faceName];

        for (let i = 0; i < 9; i++) {
            const index = offset + i;
            const btn = document.createElement("button");
            btn.classList.add("facelet");
            btn.dataset.index = index;

            // Set the correct background color class based on the cubeState
            const colorChar = state.cubeState[index];
            btn.classList.add(`c-${colorChar.toLowerCase()}`);

            // Lock central facelets (index 4 in each 0-8 face offset) to prevent illegal centers
            if (i === 4) {
                btn.classList.add("center-lock");
                btn.title = `${t('fixed-center')} ${t('face-' + faceName.toLowerCase())}`;
                btn.textContent = faceName;
            } else {
                // Interactive painting click event
                btn.addEventListener("click", (e) => {
                    e.preventDefault();

                    // Replace color in internal array
                    state.cubeState[index] = state.activeColor;

                    // Re-render only this button to avoid rebuild lag
                    btn.className = "facelet"; // reset classes
                    btn.classList.add(`c-${state.activeColor.toLowerCase()}`);

                    // Update 3D canvas colors and validate the new layout
                    update3DCubeColors();
                    validateCube();
                });
            }

            faceContainer.appendChild(btn);
        }
    });
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

// Helper to translate color initials to human names
function getColorName(char) {
    switch (char) {
        case 'U': return 'White';
        case 'L': return 'Orange';
        case 'F': return 'Green';
        case 'R': return 'Red';
        case 'B': return 'Blue';
        case 'D': return 'Yellow';
        default: return 'Unknown';
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
    render2DNet();
    validateCube();
}
