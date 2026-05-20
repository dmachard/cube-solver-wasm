/**
 * Pyraminx 2D Editor Module
 * Renders the 4 triangular faces (U, L, R, B) as interactive SVGs
 * Each face has 9 triangular facelets that can be painted with colors.
 */
import { state, PYRAMINX_FACE_MAPPINGS } from './constants.js';
import { t } from './i18n.js';

const PYRAMINX_FACES = ['U', 'L', 'R', 'B'];
const PYRAMINX_COLORS = ['U', 'L', 'R', 'B'];

// SVG triangle coordinates for 9 sub-triangles inside an equilateral triangle
// viewBox = "0 0 200 173", face pointing UP
const TRI_H = 173;
const POINTS = {
    // Row 0
    t:   [100, 0],
    // Row 1
    ml:  [66.7, 57.7],  mr: [133.3, 57.7],
    // Row 2
    ll:  [33.3, 115.3], lm: [100, 115.3], lr: [166.7, 115.3],
    // Row 3 (bottom)
    bl:  [0, TRI_H],    bml: [66.7, TRI_H], bmr: [133.3, TRI_H], br: [200, TRI_H]
};

// 9 triangles: [p1, p2, p3] — vertices as keys into POINTS
const FACE_UP_TRIANGLES = [
    // Row 0: index 0 (up)
    ['t', 'ml', 'mr'],
    // Row 1: index 1 (up), 2 (down), 3 (up)
    ['ml', 'll', 'lm'],
    ['ml', 'mr', 'lm'],
    ['mr', 'lm', 'lr'],
    // Row 2: index 4 (up), 5 (down), 6 (up), 7 (down), 8 (up)
    ['ll', 'bl', 'bml'],
    ['ll', 'lm', 'bml'],
    ['lm', 'bml', 'bmr'],
    ['lm', 'lr', 'bmr'],
    ['lr', 'bmr', 'br']
];

// For faces pointing DOWN (inverted), we flip the Y axis
function flipY(pt) {
    return [pt[0], TRI_H - pt[1]];
}

function getTrianglePoints(faceIndex) {
    // Face U (index 0) points UP; L, R, B (index 1,2,3) point DOWN in the net
    if (faceIndex === 0) {
        return FACE_UP_TRIANGLES.map(tri =>
            tri.map(k => POINTS[k].join(',')).join(' ')
        );
    } else {
        return FACE_UP_TRIANGLES.map(tri =>
            tri.map(k => flipY(POINTS[k]).join(',')).join(' ')
        );
    }
}

// Color map for Pyraminx faces
function getPyraminxColor(char) {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    switch (char) {
        case 'U': return style.getPropertyValue('--color-b').trim() || '#2563eb'; // Blue
        case 'L': return style.getPropertyValue('--color-d').trim() || '#ffea00'; // Yellow
        case 'R': return style.getPropertyValue('--color-r').trim() || '#ef4444'; // Red
        case 'B': return style.getPropertyValue('--color-f').trim() || '#10b981'; // Green
        default: return '#888';
    }
}

export function setViewModePyraminx(mode) {
    const net = document.getElementById("pyraminx-net");
    const faceGroup = document.getElementById("pyraminx-face-selector-group");
    const btnSingle = document.getElementById("btn-pyraminx-view-single");
    const btnUnfolded = document.getElementById("btn-pyraminx-view-unfolded");

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
    localStorage.setItem("pyraminx-solver-view-mode", mode);
}

/**
 * Initialize the Pyraminx 2D editor
 */
export function initPyraminxEditor() {
    // Setup color palette for Pyraminx (4 colors)
    const palette = document.getElementById('pyraminx-palette');
    if (!palette) return;

    palette.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            palette.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeColor = btn.dataset.color;
        });
    });

    // Setup face tabs
    const faceTabs = document.querySelectorAll('.pyraminx-face-tab');
    faceTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            faceTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            // Show only the selected face
            const selectedFace = tab.dataset.face;
            document.querySelectorAll('.pyraminx-face-svg').forEach(svg => {
                svg.classList.toggle('active-face', svg.dataset.face === selectedFace);
            });
        });
    });

    // Setup View Mode Toggle (Single vs Unfolded) for Pyraminx
    const btnSingle = document.getElementById("btn-pyraminx-view-single");
    const btnUnfolded = document.getElementById("btn-pyraminx-view-unfolded");
    if (btnSingle && btnUnfolded) {
        btnSingle.addEventListener("click", () => setViewModePyraminx("single"));
        btnUnfolded.addEventListener("click", () => setViewModePyraminx("unfolded"));
    }

    // Determine initial view mode
    const savedMode = localStorage.getItem("pyraminx-solver-view-mode");
    const initialMode = savedMode || (window.innerWidth <= 576 ? "single" : "unfolded");
    setViewModePyraminx(initialMode);
}

/**
 * Render the Pyraminx 2D net as interactive SVGs
 */
export function renderPyraminxNet() {
    const container = document.getElementById('pyraminx-net');
    if (!container) return;

    container.innerHTML = '';

    PYRAMINX_FACES.forEach((faceName, faceIdx) => {
        const offset = faceIdx * 9;
        const svgNS = 'http://www.w3.org/2000/svg';

        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 200 173');
        svg.setAttribute('class', 'pyraminx-face-svg');
        svg.setAttribute('data-face', faceName.toLowerCase());
        // Show first face by default in single-face mode
        if (faceIdx === 0) svg.classList.add('active-face');

        const trianglePoints = getTrianglePoints(faceIdx);

        for (let i = 0; i < 9; i++) {
            const index = PYRAMINX_FACE_MAPPINGS[faceIdx][i];
            const colorChar = state.cubeState[index];
            const color = getPyraminxColor(colorChar);

            const polygon = document.createElementNS(svgNS, 'polygon');
            polygon.setAttribute('points', trianglePoints[i]);
            polygon.setAttribute('fill', color);
            polygon.setAttribute('stroke', '#1e293b');
            polygon.setAttribute('stroke-width', '2');
            polygon.setAttribute('data-index', index);
            polygon.style.cursor = 'pointer';
            polygon.style.transition = 'filter 0.15s ease';

            polygon.addEventListener('mouseenter', () => {
                polygon.style.filter = 'brightness(0.85)';
            });
            polygon.addEventListener('mouseleave', () => {
                polygon.style.filter = '';
            });

            polygon.addEventListener('click', (e) => {
                e.preventDefault();
                state.cubeState[index] = state.activeColor;
                polygon.setAttribute('fill', getPyraminxColor(state.activeColor));
                // Also update 3D if available
                if (window.updatePyraminx3DColors) {
                    window.updatePyraminx3DColors();
                }
                validatePyraminx();
            });

            svg.appendChild(polygon);
        }

        // Face label
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', '100');
        text.setAttribute('y', faceIdx === 0 ? '130' : '60');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '20');
        text.setAttribute('font-weight', '700');
        text.setAttribute('fill', 'rgba(0,0,0,0.3)');
        text.setAttribute('pointer-events', 'none');
        text.textContent = faceName;
        svg.appendChild(text);

        container.appendChild(svg);
    });
}

/**
 * Validates the Pyraminx color configuration
 */
export function validatePyraminx() {
    const validationBox = document.getElementById('validation-box');
    const validationMsg = document.getElementById('validation-message');
    const solveBtn = document.getElementById('btn-solve');

    const counts = { 'U': 0, 'L': 0, 'R': 0, 'B': 0 };
    state.cubeState.forEach(char => {
        if (counts[char] !== undefined) counts[char]++;
    });

    let isValid = true;
    const errors = [];

    PYRAMINX_FACES.forEach(faceChar => {
        const count = counts[faceChar];
        if (count !== 9) {
            isValid = false;
            const faceName = t(`face-${faceChar.toLowerCase()}`);
            errors.push(`${faceName}: ${count}/9`);
        }
    });

    if (isValid) {
        validationBox.className = 'validation-box success';
        validationMsg.textContent = t('wasm-ready');
        solveBtn.disabled = false;
    } else {
        validationBox.className = 'validation-box warning';
        validationMsg.textContent = `${t('invalid-counts')}${errors.join(', ')}`;
        solveBtn.disabled = true;
    }
}

/**
 * Reset the Pyraminx to its solved state
 */
export function resetPyraminxToSolved() {
    const solved = 'UUUUUUUUULLLLLLLLLRRRRRRRRRBBBBBBBBB';
    state.cubeState = solved.split('');
    renderPyraminxNet();
    validatePyraminx();
    if (window.updatePyraminx3DColors) window.updatePyraminx3DColors();
}

/**
 * Apply a single move (including tip moves) to a 36-char state array and return new array
 */
function applyMoveStr(stateArr, mv) {
    const next = stateArr.slice();
    switch (mv) {
        case 'U':
            next[27] = stateArr[9];
            next[18] = stateArr[27];
            next[9] = stateArr[18];
            next[29] = stateArr[11];
            next[20] = stateArr[29];
            next[11] = stateArr[20];
            next[30] = stateArr[10];
            next[12] = stateArr[21];
            next[19] = stateArr[30];
            next[28] = stateArr[12];
            next[21] = stateArr[28];
            next[10] = stateArr[19];
            break;
        case "U'":
        case 'Up':
            return applyMoveStr(applyMoveStr(stateArr, 'U'), 'U');
        case 'L':
            next[22] = stateArr[4];
            next[31] = stateArr[22];
            next[4] = stateArr[31];
            next[23] = stateArr[5];
            next[32] = stateArr[23];
            next[5] = stateArr[32];
            next[24] = stateArr[28];
            next[1] = stateArr[19];
            next[33] = stateArr[1];
            next[6] = stateArr[24];
            next[28] = stateArr[6];
            next[19] = stateArr[33];
            break;
        case "L'":
        case 'Lp':
            return applyMoveStr(applyMoveStr(stateArr, 'L'), 'L');
        case 'R':
            next[35] = stateArr[8];
            next[17] = stateArr[35];
            next[8] = stateArr[17];
            next[34] = stateArr[7];
            next[16] = stateArr[34];
            next[7] = stateArr[16];
            next[3] = stateArr[12];
            next[15] = stateArr[30];
            next[33] = stateArr[3];
            next[6] = stateArr[15];
            next[30] = stateArr[6];
            next[12] = stateArr[33];
            break;
        case "R'":
        case 'Rp':
            return applyMoveStr(applyMoveStr(stateArr, 'R'), 'R');
        case 'B':
            next[26] = stateArr[0];
            next[13] = stateArr[26];
            next[0] = stateArr[13];
            next[25] = stateArr[2];
            next[14] = stateArr[25];
            next[2] = stateArr[14];
            next[3] = stateArr[10];
            next[15] = stateArr[21];
            next[24] = stateArr[3];
            next[1] = stateArr[15];
            next[21] = stateArr[1];
            next[10] = stateArr[24];
            break;
        case "B'":
        case 'Bp':
            return applyMoveStr(applyMoveStr(stateArr, 'B'), 'B');
        // Tip-only moves
        case 'u':
            next[27] = stateArr[9];
            next[18] = stateArr[27];
            next[9] = stateArr[18];
            break;
        case "u'":
            return applyMoveStr(applyMoveStr(stateArr, 'u'), 'u');
        case 'l':
            next[22] = stateArr[4];
            next[31] = stateArr[22];
            next[4] = stateArr[31];
            break;
        case "l'":
            return applyMoveStr(applyMoveStr(stateArr, 'l'), 'l');
        case 'r':
            next[35] = stateArr[8];
            next[17] = stateArr[35];
            next[8] = stateArr[17];
            break;
        case "r'":
            return applyMoveStr(applyMoveStr(stateArr, 'r'), 'r');
        case 'b':
            next[26] = stateArr[0];
            next[13] = stateArr[26];
            next[0] = stateArr[13];
            break;
        case "b'":
            return applyMoveStr(applyMoveStr(stateArr, 'b'), 'b');
        default:
            return next;
    }
    return next;
}

// Exported API: apply a single pyraminx move to the global 36-char state
export function applyPyraminxMoveToState(move) {
    const before = state.cubeState.slice();
    const next = applyMoveStr(before, move);
    
    // Log state changes for debugging
    console.log(`Applying move: ${move}`);
    for (let i = 0; i < next.length; i++) {
        if (before[i] !== next[i]) {
            console.log(`  Index ${i}: ${before[i]} -> ${next[i]}`);
        }
    }
    
    state.cubeState = next;
    renderPyraminxNet();
    validatePyraminx();
    if (window.updatePyraminx3DColors) window.updatePyraminx3DColors();
}

// Expose on window for other modules to call without circular imports
window.applyPyraminxMoveToState = applyPyraminxMoveToState;

/**
 * Generate a random Pyraminx scramble and apply it to global state
 */
export function generateRandomPyraminxState(moves = 11) {
    const base = 'UUUUUUUUULLLLLLLLLRRRRRRRRRBBBBBBBBB'.split('');
    const moveSet = ['U', "U'", 'L', "L'", 'R', "R'", 'B', "B'", 'u', "u'", 'l', "l'", 'r', "r'", 'b', "b'"];
    let curr = base;
    let last = null;
    for (let i = 0; i < moves; i++) {
        // pick a random move that's not the inverse of last (simple filter)
        let mv;
        for (let attempt = 0; attempt < 10; attempt++) {
            mv = moveSet[Math.floor(Math.random() * moveSet.length)];
            if (!last) break;
            // avoid same face twice in a row (e.g., U then U')
            if (mv[0] !== last[0]) break;
        }
        curr = applyMoveStr(curr, mv);
        last = mv;
    }
    state.cubeState = curr;
    renderPyraminxNet();
    validatePyraminx();
    if (window.updatePyraminx3DColors) window.updatePyraminx3DColors();
}

// Pure simulation: return new state array after applying mv without mutating global state
export function simulatePyraminxMove(stateArr, mv) {
    const copy = stateArr.slice();
    return applyMoveStr(copy, mv);
}

window.renderPyraminxNet = renderPyraminxNet;
window.validatePyraminx = validatePyraminx;
