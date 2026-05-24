import { state } from './constants.js';
import { cubies, scene, getSolverStringFrom3D } from './visualizer.js';
import { calculate_rotation_target } from '../pkg/cube_solver_wasm.js';
/**
 * Animates a single face rotation using GSAP, tweening to the exact target state dictated by Rust
 * @param {string} move The move string (e.g. "R", "U2", "F'")
 * @param {number} duration Animation time in milliseconds
 * @returns {Promise<void>} Resolves when the animation is fully complete
 */
export function animateMove(move, duration = 350) {
    return new Promise((resolve) => {
        if (state.isAnimating) return resolve();
        state.isAnimating = true;

        // 1. Serialize current positions and quaternions
        const positions = new Float32Array(cubies.length * 3);
        const quaternions = new Float32Array(cubies.length * 4);
        
        cubies.forEach((cubie, idx) => {
            positions[idx * 3] = cubie.position.x;
            positions[idx * 3 + 1] = cubie.position.y;
            positions[idx * 3 + 2] = cubie.position.z;
            quaternions[idx * 4] = cubie.quaternion.x;
            quaternions[idx * 4 + 1] = cubie.quaternion.y;
            quaternions[idx * 4 + 2] = cubie.quaternion.z;
            quaternions[idx * 4 + 3] = cubie.quaternion.w;
        });

        // 2. Get mathematically perfect target from Rust WASM
        const targetData = calculate_rotation_target(positions, quaternions, move);

        // 3. Select which axis we are animating around for visual grouping
        const base = move.charAt(0);
        const suffix = move.substring(1);
        
        let angle = -Math.PI / 2;
        if (suffix === "'") angle = Math.PI / 2;
        if (suffix === "2") angle = -Math.PI;

        let axis = 'y'; let filterVal = 0;
        switch (base) {
            case 'U': axis = 'y'; filterVal = 1; break;
            case 'D': axis = 'y'; filterVal = -1; angle = -angle; break;
            case 'R': axis = 'x'; filterVal = 1; break;
            case 'L': axis = 'x'; filterVal = -1; angle = -angle; break;
            case 'F': axis = 'z'; filterVal = 1; break;
            case 'B': axis = 'z'; filterVal = -1; angle = -angle; break;
        }

        // Group the animating slice just for the GSAP rotation effect
        const pivot = new THREE.Group();
        scene.add(pivot);
        const sliceCubies = [];

        cubies.forEach((cubie, idx) => {
            // Check if this cubie is moving (its target position/quaternion differs from its current)
            const targetX = targetData[idx * 7];
            const targetY = targetData[idx * 7 + 1];
            const targetZ = targetData[idx * 7 + 2];
            
            // Floating point exact check is safe since Rust returns exact integers for positions
            if (Math.round(cubie.position[axis]) === filterVal) {
                pivot.attach(cubie);
                sliceCubies.push({cubie, idx});
            }
        });

        // 4. GSAP Tween the visual pivot group
        const tweenVars = {
            duration: duration / 1000,
            ease: "power2.out",
            onComplete: () => {
                // Remove pivot group and restore hierarchy
                sliceCubies.forEach(item => {
                    scene.attach(item.cubie);
                });
                scene.remove(pivot);

                // 5. Apply the perfect snapped targets from Rust! (Zero floating point drift!)
                cubies.forEach((cubie, idx) => {
                    cubie.position.set(
                        targetData[idx * 7],
                        targetData[idx * 7 + 1],
                        targetData[idx * 7 + 2]
                    );
                    cubie.quaternion.set(
                        targetData[idx * 7 + 3],
                        targetData[idx * 7 + 4],
                        targetData[idx * 7 + 5],
                        targetData[idx * 7 + 6]
                    );
                });

                // Update 2D internal state based on new exact geometry
                getSolverStringFrom3D();

                state.isAnimating = false;
                resolve();
            }
        };

        tweenVars[axis] = angle;
        gsap.to(pivot.rotation, tweenVars);
    });
}


/**
 * Rotates a slice instantly in 3D space (used for shuffling/scrambling)
 * @param {string} move The move string (e.g. "R", "U2", "F'")
 */
export function applyMoveInstantly3D(move) {
    const positions = new Float32Array(cubies.length * 3);
    const quaternions = new Float32Array(cubies.length * 4);
    
    cubies.forEach((cubie, idx) => {
        positions[idx * 3] = cubie.position.x;
        positions[idx * 3 + 1] = cubie.position.y;
        positions[idx * 3 + 2] = cubie.position.z;
        quaternions[idx * 4] = cubie.quaternion.x;
        quaternions[idx * 4 + 1] = cubie.quaternion.y;
        quaternions[idx * 4 + 2] = cubie.quaternion.z;
        quaternions[idx * 4 + 3] = cubie.quaternion.w;
    });

    // Ask Rust for the mathematically perfect next state
    const targetData = calculate_rotation_target(positions, quaternions, move);

    // Immediately snap meshes to target state
    cubies.forEach((cubie, idx) => {
        cubie.position.set(
            targetData[idx * 7],
            targetData[idx * 7 + 1],
            targetData[idx * 7 + 2]
        );
        cubie.quaternion.set(
            targetData[idx * 7 + 3],
            targetData[idx * 7 + 4],
            targetData[idx * 7 + 5],
            targetData[idx * 7 + 6]
        );
    });
}

