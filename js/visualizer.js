import { COLOR_HEX_MAP, state } from './constants.js';

// Internal Three.js Globals
export let scene, camera, renderer, controls;
export let cubies = []; // Array holding the 26 physical cubie mesh objects

/**
 * Initializes the Three.js 3D Visualizer scene
 */
export function init3DVisualizer() {
    const container = document.getElementById("canvas-container");
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Create Scene
    scene = new THREE.Scene();

    // 2. Setup Perspective Camera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5, 5, 8); // Elegant default camera angle looking down

    // 3. Setup WebGL Renderer with high antialiasing
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Setup Orbit Camera Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Damping adds smooth weight to camera rotations
    controls.dampingFactor = 0.05;
    controls.minDistance = 4;
    controls.maxDistance = 15;

    // 5. Setup Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.45);
    dirLight1.position.set(10, 15, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.25);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    // 6. Build the initial 3D Cube Meshes
    build3DCube();

    // 7. Start the continuous rendering animation loop
    animate();

    // Handle responsive scaling dynamically using ResizeObserver on the container itself
    const resizeObserver = new ResizeObserver(() => onWindowResize());
    resizeObserver.observe(container);
}

/**
 * Responsive resize callback
 */
function onWindowResize() {
    const container = document.getElementById("canvas-container");
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

/**
 * Three.js animation and render loop
 */
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Update OrbitControls damping
    renderer.render(scene, camera);
}

/**
 * Builds the 26 cubies in the 3D grid environment
 */
export function build3DCube() {
    // Clean up existing meshes from the scene (avoids memory leaks on reset)
    cubies.forEach(cubie => scene.remove(cubie));
    cubies = [];

    const cubieSize = 0.95; // Small spacing between cubies for visual separation

    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                // Skip the central piece of the cube
                if (x === 0 && y === 0 && z === 0) continue;

                const geometry = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);

                // Initialize the 6 materials for each facelet:
                // [Right (+x), Left (-x), Up (+y), Down (-y), Front (+z), Back (-z)]
                const materials = [];
                for (let i = 0; i < 6; i++) {
                    materials.push(new THREE.MeshStandardMaterial({
                        color: new THREE.Color(COLOR_HEX_MAP['X']),
                        roughness: 0.1,
                        metalness: 0.1
                    }));
                }

                const cubieMesh = new THREE.Mesh(geometry, materials);
                cubieMesh.position.set(x, y, z);

                // Keep memory of identity grid coordinates for slice rotations
                cubieMesh.userData = {
                    origX: x,
                    origY: y,
                    origZ: z
                };

                scene.add(cubieMesh);
                cubies.push(cubieMesh);
            }
        }
    }

    // Paint the colors
    update3DCubeColors();
}

/**
 * Updates the 3D materials of each cubie based on their current active world positions
 */
export function update3DCubeColors() {
    cubies.forEach(cubie => {
        // Use original identity coordinates so stickers are permanently locked to the cubie mesh
        const cx = cubie.userData.origX;
        const cy = cubie.userData.origY;
        const cz = cubie.userData.origZ;

        // Find the active facelet indices of this cubie inside the 54-char Kociemba array
        const materials = cubie.material;

        // Reset all faces to default interior color first
        for (let i = 0; i < 6; i++) {
            materials[i].color.set(COLOR_HEX_MAP['X']);
        }

        // Apply colors based on which world direction each face is pointing to

        // 1. Right Face (+X)
        if (cx === 1) {
            const faceletIndex = 9 + (2 - (cy + 1)) * 3 + (2 - (cz + 1));
            materials[0].color.set(COLOR_HEX_MAP[state.cubeState[faceletIndex]]);
        }
        // 2. Left Face (-X)
        if (cx === -1) {
            const faceletIndex = 36 + (2 - (cy + 1)) * 3 + (cz + 1);
            materials[1].color.set(COLOR_HEX_MAP[state.cubeState[faceletIndex]]);
        }
        // 3. Up Face (+Y)
        if (cy === 1) {
            const faceletIndex = 0 + (cz + 1) * 3 + (cx + 1);
            materials[2].color.set(COLOR_HEX_MAP[state.cubeState[faceletIndex]]);
        }
        // 4. Down Face (-Y)
        if (cy === -1) {
            const faceletIndex = 27 + (2 - (cz + 1)) * 3 + (cx + 1);
            materials[3].color.set(COLOR_HEX_MAP[state.cubeState[faceletIndex]]);
        }
        // 5. Front Face (+Z)
        if (cz === 1) {
            const faceletIndex = 18 + (2 - (cy + 1)) * 3 + (cx + 1);
            materials[4].color.set(COLOR_HEX_MAP[state.cubeState[faceletIndex]]);
        }
        // 6. Back Face (-Z)
        if (cz === -1) {
            const faceletIndex = 45 + (2 - (cy + 1)) * 3 + (2 - (cx + 1));
            materials[5].color.set(COLOR_HEX_MAP[state.cubeState[faceletIndex]]);
        }
    });
}

/**
 * Extract 2D state from the 3D cubies positions and material orientations
 * This makes the 3D scene the single source of truth, avoiding any mathematical drift.
 */
export function extract2DStateFrom3D() {
    const tempState = Array(54).fill('U');

    cubies.forEach(cubie => {
        // Round coordinates to find its current world slot position
        const x = Math.round(cubie.position.x);
        const y = Math.round(cubie.position.y);
        const z = Math.round(cubie.position.z);

        // Get the rotation matrix of the cubie
        const matrix = new THREE.Matrix4();
        matrix.makeRotationFromQuaternion(cubie.quaternion);

        // Standard world normals for each face direction
        const worldNormals = [
            new THREE.Vector3(1, 0, 0),  // +x (Right)
            new THREE.Vector3(-1, 0, 0), // -x (Left)
            new THREE.Vector3(0, 1, 0),  // +y (Up)
            new THREE.Vector3(0, -1, 0), // -y (Down)
            new THREE.Vector3(0, 0, 1),  // +z (Front)
            new THREE.Vector3(0, 0, -1)  // -z (Back)
        ];

        // Local normals of the box materials
        const localNormals = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1)
        ];

        // Loop over the 6 material faces
        for (let matIdx = 0; matIdx < 6; matIdx++) {
            const worldNormal = localNormals[matIdx].clone().applyMatrix4(matrix);

            // Find which world normal it aligns best with
            let bestWorldDir = -1;
            let maxDot = -1;
            worldNormals.forEach((n, idx) => {
                const dot = worldNormal.dot(n);
                if (dot > maxDot) {
                    maxDot = dot;
                    bestWorldDir = idx;
                }
            });

            // If the sticker points outwards in a world axis direction
            if (maxDot > 0.8) {
                // Determine the sticker's hex color
                const colorHex = '#' + cubie.material[matIdx].color.getHexString();
                let colorChar = 'U';

                for (const [char, hex] of Object.entries(COLOR_HEX_MAP)) {
                    if (hex.toLowerCase() === colorHex.toLowerCase()) {
                        colorChar = char;
                        break;
                    }
                }

                // Map world coordinate slot + world pointing direction back to Kociemba index
                // 1. Right Face (+X)
                if (bestWorldDir === 0 && x === 1) {
                    const faceletIndex = 9 + (2 - (y + 1)) * 3 + (2 - (z + 1));
                    tempState[faceletIndex] = colorChar;
                }
                // 2. Left Face (-X)
                else if (bestWorldDir === 1 && x === -1) {
                    const faceletIndex = 36 + (2 - (y + 1)) * 3 + (z + 1);
                    tempState[faceletIndex] = colorChar;
                }
                // 3. Up Face (+Y)
                else if (bestWorldDir === 2 && y === 1) {
                    const faceletIndex = 0 + (z + 1) * 3 + (x + 1);
                    tempState[faceletIndex] = colorChar;
                }
                // 4. Down Face (-Y)
                else if (bestWorldDir === 3 && y === -1) {
                    const faceletIndex = 27 + (2 - (z + 1)) * 3 + (x + 1);
                    tempState[faceletIndex] = colorChar;
                }
                // 5. Front Face (+Z)
                else if (bestWorldDir === 4 && z === 1) {
                    const faceletIndex = 18 + (2 - (y + 1)) * 3 + (x + 1);
                    tempState[faceletIndex] = colorChar;
                }
                // 6. Back Face (-Z)
                else if (bestWorldDir === 5 && z === -1) {
                    const faceletIndex = 45 + (2 - (y + 1)) * 3 + (2 - (x + 1));
                    tempState[faceletIndex] = colorChar;
                }
            }
        }
    });

    // Enforce locked centers to guarantee integrity
    const FIXED_CENTERS = {
        4: 'U',
        13: 'R',
        22: 'F',
        31: 'D',
        40: 'L',
        49: 'B'
    };
    for (const [idx, char] of Object.entries(FIXED_CENTERS)) {
        tempState[parseInt(idx)] = char;
    }

    state.cubeState = tempState;
}
