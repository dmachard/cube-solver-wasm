/**
 * Pyraminx 3D Visualizer Module
 * Renders a regular tetrahedron with colored triangular faces using Three.js
 * All edges are exactly the same length (regular tetrahedron).
 */
import { state, PYRAMINX_FACE_MAPPINGS } from './constants.js';
import { simulatePyraminxMove } from './pyraminx-editor.js';

let pyraminxScene, pyraminxCamera, pyraminxRenderer, pyraminxControls;
let pyraminxRoot;
let pyraminxMeshes = [];
let pyraminxFaceGroups = [];

// Pyraminx face colors
function getColor(char) {
    switch (char) {
        case 'U': return 0x2563eb; // Blue
        case 'L': return 0xffea00; // Yellow
        case 'R': return 0xef4444; // Red
        case 'B': return 0x10b981; // Green
        default:  return 0x888888;
    }
}

// ============================================================
// Regular tetrahedron vertices (all edges equal)
// Using v = (±1, ±1, ±1) with alternating parity, scaled
// Edge length = 2√2 × k, we use k to get a nice visual size
// ============================================================
const K = 1.2; // Scale factor → edge length = 2√2 × 1.2 ≈ 3.39
const TETRA_VERTICES = [
    new THREE.Vector3( 1 * K,  1 * K,  1 * K),  // v0
    new THREE.Vector3( 1 * K, -1 * K, -1 * K),  // v1
    new THREE.Vector3(-1 * K,  1 * K, -1 * K),  // v2
    new THREE.Vector3(-1 * K, -1 * K,  1 * K),  // v3
];

// 4 faces: each defined by 3 vertex indices (counter-clockwise winding for outward normals)
const TETRA_FACES = [
    [0, 2, 1],  // Face U (front-facing)
    [0, 3, 2],  // Face L (left-facing)
    [0, 1, 3],  // Face R (right-facing)
    [1, 2, 3],  // Face B (bottom-facing)
];

function alignPyraminxTipUp() {
    if (!pyraminxRoot) return;
    const target = new THREE.Vector3(0, 1, 0);
    const from = TETRA_VERTICES[0].clone().normalize();
    const axis = new THREE.Vector3().crossVectors(from, target);
    const angle = Math.acos(Math.max(-1, Math.min(1, from.dot(target))));
    if (axis.lengthSq() > 1e-6) {
        axis.normalize();
        pyraminxRoot.setRotationFromAxisAngle(axis, angle);
    } else {
        pyraminxRoot.rotation.set(0, 0, 0);
    }
}

/**
 * Subdivides a triangle into 9 smaller triangles using barycentric coordinates
 * Returns array of 9 triangles: [[v0,v1,v2], ...]
 */
function subdivideTriangle(va, vb, vc) {
    // Build grid points using barycentric interpolation
    // p(u, v, w) = va*u + vb*v + vc*w, where u+v+w = 1
    const p = (u, v, w) => new THREE.Vector3(
        va.x * u + vb.x * v + vc.x * w,
        va.y * u + vb.y * v + vc.y * w,
        va.z * u + vb.z * v + vc.z * w
    );

    // Grid points g[row][col]
    // Row 0: apex (va), Row 3: base (vb to vc)
    const g = [];
    for (let row = 0; row <= 3; row++) {
        g[row] = [];
        for (let col = 0; col <= row; col++) {
            const u = 1 - row / 3;
            const v = (row - col) / 3;
            const w = col / 3;
            g[row][col] = p(u, v, w);
        }
    }

    // 9 sub-triangles matching the pyraminx facelet indexing:
    // Row 0: index 0 (upward)
    // Row 1: index 1 (upward), 2 (downward), 3 (upward)
    // Row 2: index 4 (upward), 5 (downward), 6 (upward), 7 (downward), 8 (upward)
    return [
        [g[0][0], g[1][0], g[1][1]],           // 0 up
        [g[1][0], g[2][0], g[2][1]],           // 1 up
        [g[1][0], g[1][1], g[2][1]],           // 2 down
        [g[1][1], g[2][1], g[2][2]],           // 3 up
        [g[2][0], g[3][0], g[3][1]],           // 4 up
        [g[2][0], g[2][1], g[3][1]],           // 5 down
        [g[2][1], g[3][1], g[3][2]],           // 6 up
        [g[2][1], g[2][2], g[3][2]],           // 7 down
        [g[2][2], g[3][2], g[3][3]],           // 8 up
    ];
}

/**
 * Build a single colored triangle mesh with slight inward shrink for gap effect
 */
function buildTriangleMesh(v0, v1, v2, color) {
    // Keep triangles mostly flush with a tiny gap so the facelets remain visible.
    const center = new THREE.Vector3().addVectors(v0, v1).add(v2).divideScalar(3);
    const shrink = 0.018;
    const s0 = new THREE.Vector3().lerpVectors(v0, center, shrink);
    const s1 = new THREE.Vector3().lerpVectors(v1, center, shrink);
    const s2 = new THREE.Vector3().lerpVectors(v2, center, shrink);

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        s0.x, s0.y, s0.z,
        s1.x, s1.y, s1.z,
        s2.x, s2.y, s2.z
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
        color: color,
        side: THREE.DoubleSide,
        flatShading: true,
        shininess: 30,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
    });

    return new THREE.Mesh(geometry, material);
}

/**
 * Initialize the 3D Pyraminx visualizer
 */
export function initPyraminx3D() {
    const container = document.getElementById('pyraminx-canvas-container');
    if (!container) return;

    // Scene
    pyraminxScene = new THREE.Scene();
    pyraminxScene.background = new THREE.Color(0x0f172a);

    // Camera
    pyraminxCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    pyraminxCamera.position.set(0, 3.5, 4.5);
    pyraminxCamera.lookAt(0, 0, 0);

    // Renderer
    pyraminxRenderer = new THREE.WebGLRenderer({ antialias: true });
    pyraminxRenderer.setSize(container.clientWidth, container.clientHeight);
    pyraminxRenderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(pyraminxRenderer.domElement);

    // Controls
    pyraminxControls = new THREE.OrbitControls(pyraminxCamera, pyraminxRenderer.domElement);
    pyraminxControls.enableDamping = true;
    pyraminxControls.dampingFactor = 0.08;
    pyraminxControls.target.set(0, 0, 0);

    // Root group for the Pyraminx meshes so we can orient the tip upward
    pyraminxRoot = new THREE.Group();
    pyraminxScene.add(pyraminxRoot);
    alignPyraminxTipUp();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    pyraminxScene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight1.position.set(5, 8, 6);
    pyraminxScene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-4, -2, -5);
    pyraminxScene.add(dirLight2);

    // Build the tetrahedron
    buildPyraminx3D();

    // Click-to-paint on 3D Pyraminx
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const onPointerDown = (e) => {
        startX = e.clientX;
        startY = e.clientY;
        startTime = Date.now();
    };

    const onPointerUp = (e) => {
        const diffX = Math.abs(e.clientX - startX);
        const diffY = Math.abs(e.clientY - startY);
        const duration = Date.now() - startTime;

        // If mouse moved less than 5px and click took less than 350ms, treat as click rather than drag
        if (diffX < 5 && diffY < 5 && duration < 350) {
            const rect = pyraminxRenderer.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, pyraminxCamera);

            // Intersect with facelet meshes
            const intersects = raycaster.intersectObjects(pyraminxMeshes);

            if (intersects.length > 0) {
                // Find first intersected facelet mesh
                const hit = intersects.find(it => it.object.userData && it.object.userData.index !== undefined);
                if (hit) {
                    const idx = hit.object.userData.index;
                    state.cubeState[idx] = state.activeColor;
                    
                    updatePyraminx3DColors();

                    if (window.renderPyraminxNet) window.renderPyraminxNet();
                    if (window.validatePyraminx) window.validatePyraminx();
                }
            }
        }
    };

    pyraminxRenderer.domElement.addEventListener('pointerdown', onPointerDown);
    pyraminxRenderer.domElement.addEventListener('pointerup', onPointerUp);

    // Resize handler
    const onResize = () => {
        if (!container.clientWidth) return;
        pyraminxCamera.aspect = container.clientWidth / container.clientHeight;
        pyraminxCamera.updateProjectionMatrix();
        pyraminxRenderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        pyraminxControls.update();
        pyraminxRenderer.render(pyraminxScene, pyraminxCamera);
    }
    animate();

    // Expose global update function for the 2D editor
    window.updatePyraminx3DColors = updatePyraminx3DColors;
    window.buildPyraminx3D = buildPyraminx3D;
}

/**
 * Build or rebuild the 3D Pyraminx meshes from current state
 */
export function buildPyraminx3D() {
    if (!pyraminxScene) return;

    // Remove existing root and meshes
    if (pyraminxRoot) {
        pyraminxScene.remove(pyraminxRoot);
        pyraminxRoot = null;
    }
    pyraminxMeshes.forEach(m => {
        if (m.parent) m.parent.remove(m);
    });
    pyraminxMeshes = [];

    pyraminxRoot = new THREE.Group();
    alignPyraminxTipUp();
    pyraminxScene.add(pyraminxRoot);

    // Dark internal structure (solid tetrahedron) to support the sticker faces
    const innerGeo = new THREE.TetrahedronGeometry(K * 1.65, 0);
    const innerMat = new THREE.MeshPhongMaterial({ color: 0x1e293b, flatShading: true });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    pyraminxRoot.add(innerMesh);
    pyraminxMeshes.push(innerMesh);

    // Build each face's 9 colored triangles
    pyraminxFaceGroups = [];
    TETRA_FACES.forEach((faceVerts, faceIdx) => {
        const va = TETRA_VERTICES[faceVerts[0]];
        const vb = TETRA_VERTICES[faceVerts[1]];
        const vc = TETRA_VERTICES[faceVerts[2]];

        // Push face outward slightly so it sits above the inner structure
        const faceCenter = new THREE.Vector3().addVectors(va, vb).add(vc).divideScalar(3);
        const normal = faceCenter.clone().normalize().multiplyScalar(0.01);

        const subTriangles = subdivideTriangle(va, vb, vc);

        subTriangles.forEach((tri, triIdx) => {
            const index = PYRAMINX_FACE_MAPPINGS[faceIdx][triIdx];
            const colorChar = state.cubeState[index] || 'U';
            const color = getColor(colorChar);

            const mesh = buildTriangleMesh(
                tri[0].clone().add(normal),
                tri[1].clone().add(normal),
                tri[2].clone().add(normal),
                color
            );
            mesh.userData = { faceIdx, triIdx, index };

            if (pyraminxRoot) {
                pyraminxRoot.add(mesh);
            } else {
                pyraminxScene.add(mesh);
            }
            pyraminxMeshes.push(mesh);
        });
    });
}

/**
 * Update the colors of existing 3D meshes without rebuilding geometry
 */
export function updatePyraminx3DColors() {
    pyraminxMeshes.forEach(mesh => {
        if (mesh.userData && mesh.userData.index !== undefined) {
            const colorChar = state.cubeState[mesh.userData.index] || 'U';
            mesh.material.color.setHex(getColor(colorChar));
        }
    });
}

// Animation helper for Pyraminx moves using a temporary 3D pivot group and GSAP
export function animatePyraminxMove(move, duration = 500) {
    return new Promise((resolve) => {
        if (!pyraminxScene || state.isAnimating) return resolve();
        state.isAnimating = true;

        const base = move.charAt(0);
        const suffix = move.substring(1);

        // angle: single core/tip move is 120deg (2pi/3); prime is opposite
        let angle = -2 * Math.PI / 3;
        if (suffix === "'") angle = 2 * Math.PI / 3;
        if (suffix === '2') angle = -4 * Math.PI / 3;

        // Vertex index mapping for rotation axis
        // U/u -> v3, L/l -> v1, R/r -> v2, B/b -> v0
        const vertexMap = {
            'U': 3, 'u': 3,
            'L': 1, 'l': 1,
            'R': 2, 'r': 2,
            'B': 0, 'b': 0
        };
        const vertexIdx = vertexMap[base];
        if (vertexIdx === undefined) {
            if (window.applyPyraminxMoveToState) window.applyPyraminxMoveToState(move);
            state.isAnimating = false;
            return resolve();
        }

        const vertex = TETRA_VERTICES[vertexIdx];
        const axis = vertex.clone().normalize();

        // Get the physically affected indices by simulating the move on a mock state
        const mockState = Array.from({ length: 36 }, (_, i) => i);
        const permutedState = simulatePyraminxMove(mockState, move);
        const affectedIndices = [];
        for (let i = 0; i < 36; i++) {
            if (permutedState[i] !== i) {
                affectedIndices.push(i);
            }
        }

        // Collect all meshes belonging to the rotating layer
        const sliceMeshes = pyraminxMeshes.filter(mesh => {
            return mesh.userData && affectedIndices.includes(mesh.userData.index);
        });

        // Assemble the temporary pivot group around the rotation vertex
        const pivot = new THREE.Group();
        const pivotPoint = vertex.clone();
        const worldAxis = axis.clone();
        if (pyraminxRoot) {
            const rootQuat = new THREE.Quaternion();
            const rootPos = new THREE.Vector3();
            pyraminxRoot.getWorldQuaternion(rootQuat);
            pyraminxRoot.getWorldPosition(rootPos);
            worldAxis.applyQuaternion(rootQuat).normalize();
            pivotPoint.applyQuaternion(rootQuat).add(rootPos);
        }
        pivot.position.copy(pivotPoint);
        pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), worldAxis);
        pyraminxScene.add(pivot);

        // Attach meshes to the pivot so they rotate together as a single slice
        sliceMeshes.forEach(mesh => {
            pivot.attach(mesh);
        });

        // Trigger GSAP quaternion tween animation for arbitrary axis rotation
        const startQuat = pivot.quaternion.clone();
        const endQuat = pivot.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle));
        const anim = { t: 0 };
        gsap.to(anim, {
            duration: duration / 1000,
            t: 1,
            ease: "power2.out",
            onUpdate: () => {
                THREE.Quaternion.slerp(startQuat, endQuat, pivot.quaternion, anim.t);
            },
            onComplete: () => {
                // Re-attach meshes back to the Pyraminx root group so orientation stays consistent
                sliceMeshes.forEach(mesh => {
                    if (pyraminxRoot) {
                        pyraminxRoot.attach(mesh);
                    } else {
                        pyraminxScene.attach(mesh);
                    }

                    // Snap rotation and position to eliminate floating-point drift
                    mesh.position.x = Math.round(mesh.position.x * 1000) / 1000;
                    mesh.position.y = Math.round(mesh.position.y * 1000) / 1000;
                    mesh.position.z = Math.round(mesh.position.z * 1000) / 1000;
                    mesh.updateMatrix();

                    const matrix = mesh.matrix.clone();
                    const elements = matrix.elements;
                    const xCol = new THREE.Vector3(elements[0], elements[1], elements[2]).normalize();
                    const yCol = new THREE.Vector3(elements[4], elements[5], elements[6]).normalize();
                    xCol.set(Math.round(xCol.x), Math.round(xCol.y), Math.round(xCol.z));
                    yCol.set(Math.round(yCol.x), Math.round(yCol.y), Math.round(yCol.z));
                    const zCol = new THREE.Vector3().crossVectors(xCol, yCol).normalize();

                    elements[0] = xCol.x; elements[1] = xCol.y; elements[2] = xCol.z;
                    elements[4] = yCol.x; elements[5] = yCol.y; elements[6] = yCol.z;
                    elements[8] = zCol.x; elements[9] = zCol.y; elements[10] = zCol.z;

                    mesh.matrix.copy(matrix);
                    mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
                });

                if (pivot.parent) pivot.parent.remove(pivot);

                // Update logical state and colors
                if (window.applyPyraminxMoveToState) window.applyPyraminxMoveToState(move);
                state.isAnimating = false;
                resolve();
            }
        });
    });
}

export function applyPyraminxMoveInstant(move) {
    // Update logical state instantly and refresh colors
    if (window.applyPyraminxMoveToState) window.applyPyraminxMoveToState(move);
}

/**
 * Rotates the 3D Pyraminx camera around the Y-axis by 120 degrees left or right
 */
export function rotatePyraminxCamera(direction) {
    if (!pyraminxCamera || !pyraminxControls) return;

    // A tetrahedron has 3-fold symmetry around Y axis, so 120 degrees is perfect!
    const angleDiff = direction === 'left' ? (2 * Math.PI / 3) : (-2 * Math.PI / 3);

    const x = pyraminxCamera.position.x;
    const z = pyraminxCamera.position.z;
    const r = Math.sqrt(x * x + z * z);
    const startAngle = Math.atan2(z, x);
    const targetAngle = startAngle + angleDiff;

    const animObj = { angle: startAngle };

    gsap.to(animObj, {
        angle: targetAngle,
        duration: 0.5,
        ease: "power2.out",
        onUpdate: () => {
            pyraminxCamera.position.x = r * Math.cos(animObj.angle);
            pyraminxCamera.position.z = r * Math.sin(animObj.angle);
            pyraminxCamera.lookAt(0, 0, 0);
            pyraminxControls.update();
        }
    });
}

/**
 * Resets the 3D Pyraminx camera position to the default angle
 */
export function resetPyraminxCamera() {
    if (!pyraminxCamera || !pyraminxControls) return;

    gsap.to(pyraminxCamera.position, {
        x: 3,
        y: 2,
        z: 4,
        duration: 0.5,
        ease: "power2.out",
        onUpdate: () => {
            pyraminxCamera.lookAt(0, 0, 0);
            pyraminxControls.update();
        }
    });
}
