import { state } from './constants.js';
import { animateMove, applyMoveInstantly3D } from './rotations.js';


/**
 * Initializes the media player buttons and speed listeners
 */
export function initPlayerControls() {
    // Handled dynamically via click events on vertical step nodes
}

/**
 * Parses the WASM raw solution string and builds the horizontal timeline
 * @param {string} movesString The space-separated list of moves (e.g. "R U2 F'")
 * @param {number} solveTimeMs Benchmark time taken by the Rust Kociemba algorithm
 */
export function showSolution(movesString, solveTimeMs) {
    // Parse moves
    state.solutionMoves = movesString.trim() ? movesString.trim().split(/\s+/) : [];
    state.currentMoveIndex = -1; // Reset cursor to beginning

    const timeline = document.getElementById("moves-timeline");
    timeline.innerHTML = ''; // Clear previous nodes



    // Build timeline step nodes (N + 1 nodes, starting with Étape 0)
    // Étape 0 represents the initial scrambled state before any moves are made
    const nodeStart = document.createElement("button");
    nodeStart.classList.add("step-node");
    nodeStart.textContent = "0";
    nodeStart.id = `step--1`; // Mapped to initial state index -1

    nodeStart.addEventListener("click", async () => {
        if (state.isAnimating) return;
        await jumpToStep(-1);
    });
    timeline.appendChild(nodeStart);

    // Nodes 1 to N representing each move applied
    state.solutionMoves.forEach((move, index) => {
        const node = document.createElement("button");
        node.classList.add("step-node");

        const stepNum = index + 1;
        node.textContent = stepNum.toString();
        node.id = `step-${index}`; // Mapped to move index

        node.addEventListener("click", async () => {
            if (state.isAnimating) return;
            await jumpToStep(index);
        });

        timeline.appendChild(node);
    });

    // Show the player panel card
    document.getElementById("player-panel").classList.remove("hidden");

    // Highlight initial step 0 immediately
    updateTimelineHighlights();
}

/**
 * Steps one move forward in the solution timeline
 */
async function stepForward() {
    if (state.currentMoveIndex >= state.solutionMoves.length - 1) {
        return;
    }

    state.currentMoveIndex++;
    const move = state.solutionMoves[state.currentMoveIndex];
    const duration = getAnimationDuration();

    // Trigger slice rotation animation
    await animateMove(move, duration);

    updateTimelineHighlights();
}

/**
 * Steps one move backward in the solution timeline (animates the inverse move)
 */
async function stepBackward() {
    if (state.currentMoveIndex < 0) return;

    const move = state.solutionMoves[state.currentMoveIndex];
    const duration = getAnimationDuration();

    // Calculate the mathematical inverse move
    const inverseMove = getInverseMove(move);

    // Trigger inverse slice rotation animation
    await animateMove(inverseMove, duration);

    state.currentMoveIndex--;
    updateTimelineHighlights();
}

/**
 * Automatically jumps/scrubs to a specific step in the timeline
 * @param {number} targetIndex The target step index to reach
 */
async function jumpToStep(targetIndex) {
    if (targetIndex === state.currentMoveIndex) return;

    if (targetIndex > state.currentMoveIndex) {
        // Fast forward step-by-step
        while (state.currentMoveIndex < targetIndex) {
            await stepForward();
        }
    } else {
        // Rewind step-by-step
        while (state.currentMoveIndex > targetIndex) {
            await stepBackward();
        }
    }
}


/**
 * Highlights the current active move node and scrolls it into central timeline view
 */
function updateTimelineHighlights() {
    // Remove active and completed highlights from all nodes
    const nodes = document.querySelectorAll(".step-node");
    nodes.forEach(n => {
        n.classList.remove("active");
        n.classList.remove("completed");
    });

    if (state.currentMoveIndex >= -1) {
        const activeNode = document.getElementById(`step-${state.currentMoveIndex}`);
        if (activeNode) {
            activeNode.classList.add("active");

            // Auto scroll timeline container horizontally to keep active step centered ("au milieu")
            const timelineContainer = document.querySelector('.timeline-container');
            if (timelineContainer) {
                const nodeCenter = activeNode.offsetLeft + (activeNode.offsetWidth / 2);
                const containerCenter = timelineContainer.offsetWidth / 2;
                timelineContainer.scrollTo({
                    left: nodeCenter - containerCenter,
                    behavior: 'smooth'
                });
            }
        }

        // Add completed class to all step nodes that represent steps already completed
        nodes.forEach(n => {
            const nodeIdStr = n.id.replace("step-", "");
            const stepVal = parseInt(nodeIdStr, 10);
            if (stepVal < state.currentMoveIndex) {
                n.classList.add("completed");
            }
        });
    }
}

/**
 * Helper to compute the mathematical inverse of a Rubik's cube notation move
 * @param {string} move Standard move notation (e.g. "R", "U'", "F2")
 * @returns {string} The inverse move notation
 */
function getInverseMove(move) {
    const base = move.charAt(0);
    const suffix = move.substring(1);

    if (suffix === "'") {
        return base; // Inverse of counter-clockwise is clockwise (R' -> R)
    } else if (suffix === "2") {
        return move; // Double turn is its own inverse (R2 -> R2)
    } else {
        return base + "'"; // Inverse of clockwise is counter-clockwise (R -> R')
    }
}

// Hardcoded premium slow animation transition (500ms)
function getAnimationDuration() {
    return 500;
}
