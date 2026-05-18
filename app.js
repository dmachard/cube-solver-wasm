// 1. Import standard compiled WebAssembly JS bindings from wasm-pack
import init, { solve } from './pkg/cube_solver_wasm.js';

// 2. Import our clean modular specialized scripts
import { state } from './js/constants.js';
import { init3DVisualizer } from './js/visualizer.js';
import { init2DNet, validateCube } from './js/editor.js';
import { initPlayerControls, showSolution } from './js/player.js';

let wasmModule = null;

/**
 * Main application Entry Point
 */
async function startApplication() {
    try {
        // 1. Initialize our modular components in order
        init3DVisualizer();
        init2DNet();
        initPlayerControls();

        // Initialize timeline to Étape 0 immediately on startup so it is always visible!
        showSolution("", 0);

        // 2. Load the WebAssembly binary locally into the browser linear memory
        await init();
        wasmModule = true; // Set loaded flag

        // Update the validation message once Rust engine is online
        const msgEl = document.getElementById("validation-message");
        if (msgEl) {
            msgEl.textContent = "✓ WASM Rust Engine loaded successfully.";
        }

        // Run initial validation to enable buttons
        validateCube();

        // 3. Bind the main Solve button click listener
        const solveBtn = document.getElementById("btn-solve");
        solveBtn.addEventListener("click", handleSolveClick);

    } catch (err) {
        console.error("Failed to initialize WebAssembly module:", err);
        const msgEl = document.getElementById("validation-message");
        const boxEl = document.getElementById("validation-box");
        if (msgEl && boxEl) {
            boxEl.className = "validation-box error";
            msgEl.textContent = "❌ Failed to load WASM engine. Check console errors.";
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
        btnText.textContent = "Solving with Rust...";

        // Convert the 2D array representation into a 54-char string for Kociemba
        const cubeString = state.cubeState.join('');

        // Benchmark performance start
        const t0 = performance.now();

        // NATIVE CALL TO RUST SOLVER!
        const resultString = solve(cubeString);

        // Benchmark performance end
        const t1 = performance.now();
        const solveTimeMs = t1 - t0;

        // Restore button state
        loader.classList.add("hidden");
        btnText.textContent = "Solve Cube";
        solveBtn.disabled = false;

        // Handle mathematical unsolvable cases returned by the Rust crate
        if (resultString.startsWith("Error")) {
            validationBox.className = "validation-box error";
            validationMsg.textContent = `❌ ${resultString}`;

            // Reset player timeline to Étape 0
            showSolution("", 0);
        } else {
            // Success! Send solution moves to our timeline player
            validationBox.className = "validation-box success";
            validationMsg.textContent = "✓ Solution found!";

            // Populate and reveal solution timeline
            showSolution(resultString, solveTimeMs);
        }

    } catch (err) {
        console.error("An unexpected error occurred during solving:", err);
        loader.classList.add("hidden");
        btnText.textContent = "Solve Cube";
        solveBtn.disabled = false;

        validationBox.className = "validation-box error";
        validationMsg.textContent = "❌ An unexpected error occurred.";
    }
}

// Start the orchestrator on DOM Content Loaded
document.addEventListener("DOMContentLoaded", startApplication);
