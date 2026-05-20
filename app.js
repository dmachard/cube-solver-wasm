// 1. Import standard compiled WebAssembly JS bindings from wasm-pack
import init, { solve, solve_pyraminx, version } from './pkg/cube_solver_wasm.js';

// 2. Import our clean modular specialized scripts
import { state } from './js/constants.js';
import { init3DVisualizer, rotateCubeCamera, resetCubeCamera } from './js/visualizer.js';
import { init2DNet, validateCube, render2DNet, resetCubeToSolved, generateRandomValidState } from './js/editor.js';
import { initPlayerControls, showSolution } from './js/player.js';
import { initLanguage, setLanguage, t } from './js/i18n.js';
import { initThemeScheme, setThemeScheme } from './js/theme.js';

// 3. Import Pyraminx-specific modules (separate files)
import { initPyraminxEditor, renderPyraminxNet, validatePyraminx, resetPyraminxToSolved, generateRandomPyraminxState } from './js/pyraminx-editor.js';
import { initPyraminx3D, rotatePyraminxCamera, resetPyraminxCamera } from './js/pyraminx-visualizer.js';

let wasmModule = null;
let pyraminx3DInitialized = false;

/**
 * Switches puzzle type between 'cube' and 'pyraminx'
 */
function setPuzzleType(type) {
    if (state.puzzleType === type) return;
    state.puzzleType = type;

    // Update toggle buttons
    document.querySelectorAll('.puzzle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.puzzle === type);
    });

    // Toggle visibility of cube vs pyraminx UI
    const cubeMode = document.getElementById('cube-mode');
    const pyraminxMode = document.getElementById('pyraminx-mode');
    const cubeCanvas = document.getElementById('canvas-container');
    const pyraminxCanvas = document.getElementById('pyraminx-canvas-container');

    if (type === 'pyraminx') {
        cubeMode.classList.add('hidden');
        pyraminxMode.classList.remove('hidden');
        cubeCanvas.classList.add('hidden');
        pyraminxCanvas.classList.remove('hidden');

        // Reset state to Pyraminx solved state before building the 3D model
        resetPyraminxToSolved();

        // Initialize Pyraminx 3D on first switch
        if (!pyraminx3DInitialized) {
            initPyraminx3D();
            pyraminx3DInitialized = true;
        }
    } else {
        cubeMode.classList.remove('hidden');
        pyraminxMode.classList.add('hidden');
        cubeCanvas.classList.remove('hidden');
        pyraminxCanvas.classList.add('hidden');

        resetCubeToSolved();
    }

    // Reset solution player
    showSolution("", 0);
}

/**
 * Main application Entry Point
 */
async function startApplication() {
    try {
        // Initialize Theme Scheme Support
        initThemeScheme();
        const themeSelect = document.getElementById("theme-select");
        if (themeSelect) {
            themeSelect.addEventListener("change", (e) => {
                setThemeScheme(e.target.value);
                render2DNet();
                validateCube();
            });
        }

        // Initialize Language Support
        initLanguage();
        const langSelect = document.getElementById("lang-select");
        if (langSelect) {
            langSelect.addEventListener("change", (e) => {
                setLanguage(e.target.value);
                if (state.puzzleType === 'pyraminx') {
                    renderPyraminxNet();
                    validatePyraminx();
                } else {
                    render2DNet();
                    validateCube();
                }
            });
        }

        // Initialize Puzzle Type Selector
        const btnCube = document.getElementById("btn-puzzle-cube");
        const btnPyraminx = document.getElementById("btn-puzzle-pyraminx");
        if (btnCube) btnCube.addEventListener("click", () => setPuzzleType("cube"));
        if (btnPyraminx) btnPyraminx.addEventListener("click", () => setPuzzleType("pyraminx"));

        // 1. Initialize our modular components in order
        init3DVisualizer();
        init2DNet();
        initPyraminxEditor();
        initPlayerControls();

        // 3D Camera Rotation Controls Click Listeners
        document.getElementById("btn-cube-rotate-left").addEventListener("click", () => rotateCubeCamera("left"));
        document.getElementById("btn-cube-rotate-right").addEventListener("click", () => rotateCubeCamera("right"));
        document.getElementById("btn-cube-reset-view").addEventListener("click", () => resetCubeCamera());

        document.getElementById("btn-pyra-rotate-left").addEventListener("click", () => rotatePyraminxCamera("left"));
        document.getElementById("btn-pyra-rotate-right").addEventListener("click", () => rotatePyraminxCamera("right"));
        document.getElementById("btn-pyra-reset-view").addEventListener("click", () => resetPyraminxCamera());

        // Initialize timeline to Étape 0 immediately on startup so it is always visible!
        showSolution("", 0);

        // 2. Load the WebAssembly binary locally into the browser linear memory
        await init();
        wasmModule = true; // Set loaded flag

        // Populate application version dynamically from WASM
        const versionEl = document.querySelector(".app-version");
        if (versionEl) {
            versionEl.textContent = `v${version()}`;
        }

        // Update the validation message once Rust engine is online
        const msgEl = document.getElementById("validation-message");
        if (msgEl) {
            msgEl.textContent = t("wasm-loaded");
        }

        // Run initial validation to enable buttons
        validateCube();

        // 3. Bind the main Solve button click listener
        const solveBtn = document.getElementById("btn-solve");
        solveBtn.addEventListener("click", handleSolveClick);

        // 4. Bind Reset and Scramble buttons (route to correct puzzle type)
        document.getElementById("btn-reset").addEventListener("click", () => {
            if (state.puzzleType === 'pyraminx') {
                resetPyraminxToSolved();
            } else {
                resetCubeToSolved();
            }
            showSolution("", 0);
        });

        document.getElementById("btn-random").addEventListener("click", () => {
            if (state.puzzleType === 'pyraminx') {
                // Generate a random pyraminx scramble and apply it
                generateRandomPyraminxState(11);
            } else {
                generateRandomValidState();
            }
            showSolution("", 0);
        });

    } catch (err) {
        console.error("Failed to initialize WebAssembly module:", err);
        const msgEl = document.getElementById("validation-message");
        const boxEl = document.getElementById("validation-box");
        if (msgEl && boxEl) {
            boxEl.className = "validation-box error";
            msgEl.textContent = t("wasm-failed");
        }
    }
}

/**
 * Solve button click orchestrator: triggers the WASM solver and tracks performance
 */
async function handleSolveClick() {
    const solveBtn = document.getElementById("btn-solve");
    const loader = solveBtn.querySelector(".loader");
    const btnText = solveBtn.querySelector(".btn-text");
    const validationBox = document.getElementById("validation-box");
    const validationMsg = document.getElementById("validation-message");

    // Block double clicks or solve operations during active animation turns
    if (state.isAnimating) return;

    try {
        // Show spinner loader state
        solveBtn.disabled = true;
        loader.classList.remove("hidden");
        btnText.textContent = t("solving");

        // Convert the state array to string
        const cubeString = state.cubeState.join('');
        console.log(`[Solve] puzzleType=${state.puzzleType}, stateString="${cubeString}" (length=${cubeString.length})`);

        // Benchmark performance start
        const t0 = performance.now();

        // NATIVE CALL TO RUST SOLVER! (choose solver based on puzzle type)
        let resultString;
        if (state.puzzleType === 'pyraminx') {
            resultString = solve_pyraminx(cubeString);
        } else {
            resultString = solve(cubeString);
        }

        // Benchmark performance end
        const t1 = performance.now();
        const solveTimeMs = t1 - t0;

        // Restore button state
        loader.classList.add("hidden");
        btnText.textContent = t("solve-cube");
        solveBtn.disabled = false;

        // Handle mathematical unsolvable cases returned by the Rust crate
        if (resultString.startsWith("Error")) {
            validationBox.className = "validation-box error";
            validationMsg.textContent = `${resultString}`;

            // Reset player timeline to Étape 0
            showSolution("", 0);
        } else {
            // Success! Send solution moves to our timeline player
            validationBox.className = "validation-box success";
            validationMsg.textContent = t("solution-found");

            // Populate and reveal solution timeline
            showSolution(resultString, solveTimeMs);

            // Scroll to 3D visualizer panel on mobile devices
            const visualizerPanel = document.querySelector('.visualizer-panel');
            if (visualizerPanel && window.innerWidth <= 968) {
                visualizerPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
            }
        }

    } catch (err) {
        console.error("An unexpected error occurred during solving:", err);
        loader.classList.add("hidden");
        btnText.textContent = t("solve-cube");
        solveBtn.disabled = false;

        validationBox.className = "validation-box error";
        validationMsg.textContent = t("unexpected-error");
    }
}

// Start the orchestrator on DOM Content Loaded
document.addEventListener("DOMContentLoaded", startApplication);
