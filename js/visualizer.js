import { COLOR_HEX_MAP, state } from './constants.js';
import { validateCube } from './editor.js';
import { extract_state_from_3d } from '../pkg/cube_solver_wasm.js';

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
    camera.position.set(4, 4, 6); // Closer camera angle to make the cube look bigger

    // 3. Setup WebGL Renderer with high antialiasing
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Setup Orbit Camera Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Damping adds smooth weight to camera rotations
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.target.set(0, -0.5, 0); // Point slightly below the cube to move it up visually

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

    // Setup raycaster for 3D painting
    setupRaycaster();
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

function setupRaycaster() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let pointerDownTime = 0;
    let pointerDownPos = { x: 0, y: 0 };

    renderer.domElement.addEventListener('pointerdown', (e) => {
        pointerDownTime = Date.now();
        pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('pointerup', (e) => {
        const timeDiff = Date.now() - pointerDownTime;
        const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
        
        // Treat as click if quick and little movement
        if (timeDiff < 300 && dist < 10) {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(cubies);

            if (intersects.length > 0) {
                const intersection = intersects[0];
                const cubie = intersection.object;
                const materialIndex = Math.floor(intersection.faceIndex / 2);

                // Prevent painting center pieces (fixed)
                const cx = cubie.userData.origX;
                const cy = cubie.userData.origY;
                const cz = cubie.userData.origZ;
                const isCenter = (Math.abs(cx) + Math.abs(cy) + Math.abs(cz)) === 1;

                if (!isCenter) {
                    cubie.material[materialIndex].color.set(COLOR_HEX_MAP[state.activeColor]);
                    getSolverStringFrom3D();
                    validateCube();
                }
            }
        }
    });
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
 * Passes Float32Arrays to Rust WASM for fast geometric dot products and index mappings.
 */
export function getSolverStringFrom3D() {
    const positions = new Float32Array(cubies.length * 3);
    const quaternions = new Float32Array(cubies.length * 4);
    let faceColors = "";

    cubies.forEach((cubie, idx) => {
        // Collect Positions
        positions[idx * 3] = cubie.position.x;
        positions[idx * 3 + 1] = cubie.position.y;
        positions[idx * 3 + 2] = cubie.position.z;

        // Collect Quaternions
        quaternions[idx * 4] = cubie.quaternion.x;
        quaternions[idx * 4 + 1] = cubie.quaternion.y;
        quaternions[idx * 4 + 2] = cubie.quaternion.z;
        quaternions[idx * 4 + 3] = cubie.quaternion.w;

        // Collect the facelet Kociemba characters in local space order
        for (let matIdx = 0; matIdx < 6; matIdx++) {
            const colorHex = '#' + cubie.material[matIdx].color.getHexString();
            let colorChar = 'U';

            for (const [char, hex] of Object.entries(COLOR_HEX_MAP)) {
                if (hex.toLowerCase() === colorHex.toLowerCase()) {
                    colorChar = char;
                    break;
                }
            }
            faceColors += colorChar;
        }
    });

    // Delegate the heavy math and matrix extraction to the Rust WASM module!
    const resultStr = extract_state_from_3d(positions, quaternions, faceColors);
    
    state.cubeState = resultStr.split('');
}
