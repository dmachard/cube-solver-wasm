import { state } from './constants.js';
import { cubies, scene, extract2DStateFrom3D } from './visualizer.js';
import { render2DNet } from './editor.js';

/**
 * Animates a single face rotation using a temporary 3D pivot group and GSAP
 * @param {string} move The move string (e.g. "R", "U2", "F'")
 * @param {number} duration Animation time in milliseconds
 * @returns {Promise<void>} Resolves when the animation is fully complete
 */
export function animateMove(move, duration = 350) {
    return new Promise((resolve) => {
        if (state.isAnimating) return resolve();
        state.isAnimating = true;

        const base = move.charAt(0);
        const suffix = move.substring(1);

        // 1. Determine rotation angle (in radians)
        let angle = -Math.PI / 2; // Default clockwise
        if (suffix === "'") angle = Math.PI / 2; // Counter-clockwise
        if (suffix === "2") angle = -Math.PI;      // Double turn

        // 2. Select the axis, normal vector and filtering coordinate condition
        let axis = 'y';
        let filterCoordinate = 'y';
        let filterValue = 0;

        switch (base) {
            case 'U': // Upper face (y = 1)
                axis = 'y';
                filterCoordinate = 'y';
                filterValue = 1;
                // Clockwise around normal +Y is negative
                break;
            case 'D': // Down face (y = -1)
                axis = 'y';
                filterCoordinate = 'y';
                filterValue = -1;
                // Clockwise around normal -Y is positive around +Y
                angle = -angle;
                break;
            case 'R': // Right face (x = 1)
                axis = 'x';
                filterCoordinate = 'x';
                filterValue = 1;
                // Clockwise around normal +X is negative
                break;
            case 'L': // Left face (x = -1)
                axis = 'x';
                filterCoordinate = 'x';
                filterValue = -1;
                // Clockwise around normal -X is positive around +X
                angle = -angle;
                break;
            case 'F': // Front face (z = 1)
                axis = 'z';
                filterCoordinate = 'z';
                filterValue = 1;
                // Clockwise around normal +Z is negative
                break;
            case 'B': // Back face (z = -1)
                axis = 'z';
                filterCoordinate = 'z';
                filterValue = -1;
                // Clockwise around normal -Z is positive around +Z
                angle = -angle;
                break;
        }

        // 3. Collect all 9 cubies belonging to this slice
        const sliceCubies = cubies.filter(cubie => {
            const coordVal = Math.round(cubie.position[filterCoordinate]);
            return coordVal === filterValue;
        });

        // 4. Assemble the temporary pivot group
        const pivot = new THREE.Group();
        scene.add(pivot);

        // Attach cubies to the pivot without altering their world transformation
        sliceCubies.forEach(cubie => {
            pivot.attach(cubie);
        });

        // 5. Trigger GSAP tween animation
        const tweenVars = {
            duration: duration / 1000,
            ease: "power2.out",
            onComplete: () => {
                // Snapping: Once finished, re-attach cubies back to root scene
                sliceCubies.forEach(cubie => {
                    scene.attach(cubie);

                    // Round positions to perfect integers to discard decimal drift
                    cubie.position.x = Math.round(cubie.position.x);
                    cubie.position.y = Math.round(cubie.position.y);
                    cubie.position.z = Math.round(cubie.position.z);

                    // Perfect Orthogonal Matrix Snapping to completely eliminate Euler twisting artifacts!
                    cubie.updateMatrix();
                    const matrix = cubie.matrix.clone();
                    const elements = matrix.elements;

                    // Deconstruct columns representing local X and Y axes
                    const xCol = new THREE.Vector3(elements[0], elements[1], elements[2]).normalize();
                    const yCol = new THREE.Vector3(elements[4], elements[5], elements[6]).normalize();

                    // Snap columns to perfect integer directions (-1, 0, 1)
                    xCol.set(Math.round(xCol.x), Math.round(xCol.y), Math.round(xCol.z));
                    yCol.set(Math.round(yCol.x), Math.round(yCol.y), Math.round(yCol.z));

                    // Reconstruct Z column orthogonally via cross product to prevent scaling/shearing
                    const zCol = new THREE.Vector3().crossVectors(xCol, yCol).normalize();

                    // Apply perfectly snapped values back to matrix elements
                    elements[0] = xCol.x; elements[1] = xCol.y; elements[2] = xCol.z;
                    elements[4] = yCol.x; elements[5] = yCol.y; elements[6] = yCol.z;
                    elements[8] = zCol.x; elements[9] = zCol.y; elements[10] = zCol.z;

                    // Snaps rotation to exact mathematical alignment
                    cubie.matrix.copy(matrix);
                    cubie.matrix.decompose(cubie.position, cubie.quaternion, cubie.scale);
                });

                // Delete pivot group
                scene.remove(pivot);

                // Update 2D net array to mirror the 3D physical rotation state using 3D-to-2D projection
                extract2DStateFrom3D();
                render2DNet();

                state.isAnimating = false;
                resolve();
            }
        };

        // Select correct axis variable target for GSAP tweening
        tweenVars[axis] = angle;
        gsap.to(pivot.rotation, tweenVars);
    });
}

/**
 * Permanently mutates the state.cubeState matching the physical 3D turn
 * (Same implementation as applyMoveInstantly to synchronize 2D net representation)
 */
function applyMoveTo2DState(move) {
    const base = move.charAt(0);
    const suffix = move.substring(1);

    let turns = 1;
    if (suffix === "'") turns = 3;
    if (suffix === "2") turns = 2;

    for (let t = 0; t < turns; t++) {
        const temp = [...state.cubeState];

        switch (base) {
            case 'U':
                permute(temp, [0, 2, 8, 6]);
                permute(temp, [1, 5, 7, 3]);
                permuteBoundary(temp, [18, 19, 20], [36, 37, 38], [45, 46, 47], [9, 10, 11]);
                break;
            case 'D':
                permute(temp, [27, 29, 35, 33]);
                permute(temp, [28, 32, 34, 30]);
                permuteBoundary(temp, [24, 25, 26], [15, 16, 17], [51, 52, 53], [42, 43, 44]);
                break;
            case 'R':
                permute(temp, [9, 11, 17, 15]);
                permute(temp, [10, 14, 16, 12]);
                permuteBoundary(temp, [2, 5, 8], [45, 48, 51], [35, 32, 29], [26, 23, 20]);
                break;
            case 'L':
                permute(temp, [36, 38, 44, 42]);
                permute(temp, [37, 41, 43, 39]);
                permuteBoundary(temp, [6, 3, 0], [18, 21, 24], [27, 30, 33], [53, 50, 47]);
                break;
            case 'F':
                permute(temp, [18, 20, 26, 24]);
                permute(temp, [19, 23, 25, 21]);
                permuteBoundary(temp, [6, 7, 8], [9, 12, 15], [29, 28, 27], [44, 41, 38]);
                break;
            case 'B':
                permute(temp, [45, 47, 53, 51]);
                permute(temp, [46, 50, 52, 48]);
                permuteBoundary(temp, [2, 1, 0], [36, 39, 42], [35, 34, 33], [17, 14, 11]);
                break;
        }
        state.cubeState = temp;
    }
}

/**
 * Rotates a slice instantly in 3D space (used for shuffling/scrambling)
 * @param {string} move The move string (e.g. "R", "U2", "F'")
 */
export function applyMoveInstantly3D(move) {
    const base = move.charAt(0);
    const suffix = move.substring(1);

    // 1. Determine rotation angle
    let angle = -Math.PI / 2;
    if (suffix === "'") angle = Math.PI / 2;
    if (suffix === "2") angle = -Math.PI;

    // 2. Select axis and filter details
    let axis = 'y';
    let filterCoordinate = 'y';
    let filterValue = 0;

    switch (base) {
        case 'U':
            axis = 'y';
            filterCoordinate = 'y';
            filterValue = 1;
            break;
        case 'D':
            axis = 'y';
            filterCoordinate = 'y';
            filterValue = -1;
            angle = -angle;
            break;
        case 'R':
            axis = 'x';
            filterCoordinate = 'x';
            filterValue = 1;
            break;
        case 'L':
            axis = 'x';
            filterCoordinate = 'x';
            filterValue = -1;
            angle = -angle;
            break;
        case 'F':
            axis = 'z';
            filterCoordinate = 'z';
            filterValue = 1;
            break;
        case 'B':
            axis = 'z';
            filterCoordinate = 'z';
            filterValue = -1;
            angle = -angle;
            break;
    }

    // 3. Collect matching cubies
    const sliceCubies = cubies.filter(cubie => {
        const coordVal = Math.round(cubie.position[filterCoordinate]);
        return coordVal === filterValue;
    });

    // 4. Create pivot group
    const pivot = new THREE.Group();
    scene.add(pivot);

    sliceCubies.forEach(cubie => {
        pivot.attach(cubie);
    });

    // 5. Rotate pivot instantly
    pivot.rotation[axis] = angle;

    // 6. Snapping
    pivot.updateMatrixWorld();
    sliceCubies.forEach(cubie => {
        scene.attach(cubie);
        cubie.position.x = Math.round(cubie.position.x);
        cubie.position.y = Math.round(cubie.position.y);
        cubie.position.z = Math.round(cubie.position.z);

        cubie.rotation.x = Math.round(cubie.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
        cubie.rotation.y = Math.round(cubie.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
        cubie.rotation.z = Math.round(cubie.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
    });

    scene.remove(pivot);
}

function permute(arr, [idx1, idx2, idx3, idx4]) {
    const temp = arr[idx4];
    arr[idx4] = arr[idx3];
    arr[idx3] = arr[idx2];
    arr[idx2] = arr[idx1];
    arr[idx1] = temp;
}

function permuteBoundary(arr, side1, side2, side3, side4) {
    const temp = [arr[side4[0]], arr[side4[1]], arr[side4[2]]];
    for (let i = 0; i < 3; i++) {
        arr[side4[i]] = arr[side3[i]];
        arr[side3[i]] = arr[side2[i]];
        arr[side2[i]] = arr[side1[i]];
        arr[side1[i]] = temp[i];
    }
}
