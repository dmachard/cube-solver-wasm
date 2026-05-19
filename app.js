// 1. Import standard compiled WebAssembly JS bindings from wasm-pack
import init, { solve, version } from './pkg/cube_solver_wasm.js';

// 2. Import our clean modular specialized scripts
import { state } from './js/constants.js';
import { init3DVisualizer } from './js/visualizer.js';
import { init2DNet, validateCube, render2DNet } from './js/editor.js';
import { initPlayerControls, showSolution } from './js/player.js';
import { initLanguage, setLanguage, t } from './js/i18n.js';
import { initThemeScheme, setThemeScheme } from './js/theme.js';

let wasmModule = null;

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
                render2DNet();
                validateCube();
            });
        }

        // 1. Initialize our modular components in order
        init3DVisualizer();
        init2DNet();
        initPlayerControls();

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
