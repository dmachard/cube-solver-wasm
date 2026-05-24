use kewb::{CubieCube, DataTable, FaceCube, Solver};
use std::sync::OnceLock;
use wasm_bindgen::prelude::*;

// to store data in memory
// OnceLock is a thread-safe container that guarantees that the tables will only be calculated once
// at the very first call to the function
static SOLVER_TABLES: OnceLock<DataTable> = OnceLock::new();

#[derive(Clone, Copy)]
struct Vec3 {
    x: f32,
    y: f32,
    z: f32,
}

impl Vec3 {
    fn dot(&self, other: &Vec3) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }
}

fn apply_quaternion(v: &Vec3, q: &[f32; 4]) -> Vec3 {
    let qx = q[0];
    let qy = q[1];
    let qz = q[2];
    let qw = q[3];

    let x2 = qx + qx;
    let y2 = qy + qy;
    let z2 = qz + qz;
    let xx = qx * x2;
    let xy = qx * y2;
    let xz = qx * z2;
    let yy = qy * y2;
    let yz = qy * z2;
    let zz = qz * z2;
    let wx = qw * x2;
    let wy = qw * y2;
    let wz = qw * z2;

    Vec3 {
        x: (1.0 - (yy + zz)) * v.x + (xy - wz) * v.y + (xz + wy) * v.z,
        y: (xy + wz) * v.x + (1.0 - (xx + zz)) * v.y + (yz - wx) * v.z,
        z: (xz - wy) * v.x + (yz + wx) * v.y + (1.0 - (xx + yy)) * v.z,
    }
}

struct Mat3 {
    m: [[f32; 3]; 3],
}

impl Mat3 {
    fn from_quat(q: &[f32; 4]) -> Self {
        let (qx, qy, qz, qw) = (q[0], q[1], q[2], q[3]);
        let x2 = qx + qx; let y2 = qy + qy; let z2 = qz + qz;
        let xx = qx * x2; let xy = qx * y2; let xz = qx * z2;
        let yy = qy * y2; let yz = qy * z2; let zz = qz * z2;
        let wx = qw * x2; let wy = qw * y2; let wz = qw * z2;

        let mut mat = Mat3 {
            m: [
                [1.0 - (yy + zz), xy + wz, xz - wy],
                [xy - wz, 1.0 - (xx + zz), yz + wx],
                [xz + wy, yz - wx, 1.0 - (xx + yy)]
            ]
        };

        // Perfect integer snapping
        for i in 0..3 {
            for j in 0..3 {
                mat.m[i][j] = mat.m[i][j].round();
            }
        }
        mat
    }

    fn to_quat(&self) -> [f32; 4] {
        let m11 = self.m[0][0]; let m12 = self.m[1][0]; let m13 = self.m[2][0];
        let m21 = self.m[0][1]; let m22 = self.m[1][1]; let m23 = self.m[2][1];
        let m31 = self.m[0][2]; let m32 = self.m[1][2]; let m33 = self.m[2][2];

        let trace = m11 + m22 + m33;
        if trace > 0.0 {
            let s = 0.5 / (trace + 1.0).sqrt();
            [(m32 - m23) * s, (m13 - m31) * s, (m21 - m12) * s, 0.25 / s]
        } else if m11 > m22 && m11 > m33 {
            let s = 2.0 * (1.0 + m11 - m22 - m33).sqrt();
            [0.25 * s, (m12 + m21) / s, (m13 + m31) / s, (m32 - m23) / s]
        } else if m22 > m33 {
            let s = 2.0 * (1.0 + m22 - m11 - m33).sqrt();
            [(m12 + m21) / s, 0.25 * s, (m23 + m32) / s, (m13 - m31) / s]
        } else {
            let s = 2.0 * (1.0 + m33 - m11 - m22).sqrt();
            [(m13 + m31) / s, (m23 + m32) / s, 0.25 * s, (m21 - m12) / s]
        }
    }
}

fn rotate_cw(v: &mut Vec3, axis: char) {
    let (x, y, z) = (v.x, v.y, v.z);
    match axis {
        'x' => { v.y = z; v.z = -y; }, // -90 deg around X (ThreeJS right-handed)
        'y' => { v.x = -z; v.z = x; }, // -90 deg around Y
        'z' => { v.x = y; v.y = -x; }, // -90 deg around Z
        _ => {}
    }
}

// bridge between rust and javascript
#[wasm_bindgen]
pub fn solve(cube_string: &str) -> String {
    // init tables
    let tables = SOLVER_TABLES.get_or_init(DataTable::default);

    // parse the 54 characters string from Kociemba (ex: "UUUU...")
    let face_cube = match FaceCube::try_from(cube_string) {
        Ok(fc) => fc,
        Err(_) => return "Error: Invalid string format.".to_string(),
    };

    // convert 2D colored facets into 3D mathematical structure of Rubik's Cube
    let cubie_cube = match CubieCube::try_from(&face_cube) {
        Ok(cc) => cc,
        Err(_) => return "Error: Invalid configuration (invalid facets).".to_string(),
    };

    // create two-phase solver with our pre-calculated tables
    // 23 is the maximum number of moves allowed. None disables the crate's buggy internal timeout.
    let mut solver = Solver::new(tables, 23, None);

    // launch the resolution
    match solver.solve(cubie_cube) {
        Some(solution) => {
            // return the moves separated by spaces (ex: "U2 R' F")
            solution.to_string()
        }
        None => "No solution found.".to_string(),
    }
}

/// Expose the package version defined in Cargo.toml at compile time
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Validate if a given 54-character cube string represents a mathematically solvable state.
#[wasm_bindgen]
pub fn is_valid_state(cube_string: &str) -> bool {
    let face_cube = match FaceCube::try_from(cube_string) {
        Ok(fc) => fc,
        Err(_) => return false,
    };

    match CubieCube::try_from(&face_cube) {
        Ok(_) => true,
        Err(_) => false,
    }
}

/// Extracts the 54-char Kociemba 2D state from the 3D physical state (positions, quaternions, and face colors).
#[wasm_bindgen]
pub fn extract_state_from_3d(positions: &[f32], quaternions: &[f32], face_colors: &str) -> String {
    let mut temp_state = vec!['U'; 54];
    let colors_chars: Vec<char> = face_colors.chars().collect();

    let world_normals = [
        Vec3 { x: 1.0, y: 0.0, z: 0.0 },   // +x
        Vec3 { x: -1.0, y: 0.0, z: 0.0 },  // -x
        Vec3 { x: 0.0, y: 1.0, z: 0.0 },   // +y
        Vec3 { x: 0.0, y: -1.0, z: 0.0 },  // -y
        Vec3 { x: 0.0, y: 0.0, z: 1.0 },   // +z
        Vec3 { x: 0.0, y: 0.0, z: -1.0 },  // -z
    ];

    let local_normals = [
        Vec3 { x: 1.0, y: 0.0, z: 0.0 },
        Vec3 { x: -1.0, y: 0.0, z: 0.0 },
        Vec3 { x: 0.0, y: 1.0, z: 0.0 },
        Vec3 { x: 0.0, y: -1.0, z: 0.0 },
        Vec3 { x: 0.0, y: 0.0, z: 1.0 },
        Vec3 { x: 0.0, y: 0.0, z: -1.0 },
    ];

    for i in 0..26 {
        let x = positions[i * 3].round() as i32;
        let y = positions[i * 3 + 1].round() as i32;
        let z = positions[i * 3 + 2].round() as i32;

        let q = [
            quaternions[i * 4],
            quaternions[i * 4 + 1],
            quaternions[i * 4 + 2],
            quaternions[i * 4 + 3],
        ];

        for mat_idx in 0..6 {
            let local_normal = &local_normals[mat_idx];
            let world_normal = apply_quaternion(local_normal, &q);

            let mut best_world_dir = -1;
            let mut max_dot = -1.0;

            for (idx, n) in world_normals.iter().enumerate() {
                let dot = world_normal.dot(n);
                if dot > max_dot {
                    max_dot = dot;
                    best_world_dir = idx as i32;
                }
            }

            if max_dot > 0.8 {
                let color_char = colors_chars[i * 6 + mat_idx];
                let mut facelet_index = -1;

                if best_world_dir == 0 && x == 1 {
                    facelet_index = 9 + (2 - (y + 1)) * 3 + (2 - (z + 1));
                } else if best_world_dir == 1 && x == -1 {
                    facelet_index = 36 + (2 - (y + 1)) * 3 + (z + 1);
                } else if best_world_dir == 2 && y == 1 {
                    facelet_index = 0 + (z + 1) * 3 + (x + 1);
                } else if best_world_dir == 3 && y == -1 {
                    facelet_index = 27 + (2 - (z + 1)) * 3 + (x + 1);
                } else if best_world_dir == 4 && z == 1 {
                    facelet_index = 18 + (2 - (y + 1)) * 3 + (x + 1);
                } else if best_world_dir == 5 && z == -1 {
                    facelet_index = 45 + (2 - (y + 1)) * 3 + (2 - (x + 1));
                }

                if facelet_index != -1 {
                    temp_state[facelet_index as usize] = color_char;
                }
            }
        }
    }

    // Enforce locked centers
    temp_state[4] = 'U';
    temp_state[13] = 'R';
    temp_state[22] = 'F';
    temp_state[31] = 'D';
    temp_state[40] = 'L';
    temp_state[49] = 'B';

    temp_state.into_iter().collect()
}

/// Calculates the exact target mathematical position and quaternion for all 26 cubies after a rotation move.
/// Returns a flat Float32Array of length 26 * 7 = 182 containing [x,y,z, qx,qy,qz,qw] for each cubie.
#[wasm_bindgen]
pub fn calculate_rotation_target(positions: &[f32], quaternions: &[f32], move_str: &str) -> Vec<f32> {
    let base = move_str.chars().nth(0).unwrap_or('U');
    let suffix = if move_str.len() > 1 { move_str.chars().nth(1).unwrap() } else { ' ' };

    let (axis, filter_val, mut turns) = match base {
        'U' => ('y', 1, 1),
        'D' => ('y', -1, -1),
        'R' => ('x', 1, 1),
        'L' => ('x', -1, -1),
        'F' => ('z', 1, 1),
        'B' => ('z', -1, -1),
        _ => ('y', 0, 0),
    };

    if suffix == '\'' {
        turns = -turns;
    } else if suffix == '2' {
        turns = 2;
    }

    let cw_rotations = (turns % 4 + 4) % 4;
    let mut out_data = vec![0.0; 182];

    for i in 0..26 {
        let mut pos = Vec3 {
            x: positions[i * 3].round(),
            y: positions[i * 3 + 1].round(),
            z: positions[i * 3 + 2].round(),
        };

        let q = [
            quaternions[i * 4],
            quaternions[i * 4 + 1],
            quaternions[i * 4 + 2],
            quaternions[i * 4 + 3],
        ];

        let mut mat = Mat3::from_quat(&q);

        let belongs = match axis {
            'x' => pos.x as i32 == filter_val,
            'y' => pos.y as i32 == filter_val,
            'z' => pos.z as i32 == filter_val,
            _ => false,
        };

        if belongs {
            for _ in 0..cw_rotations {
                rotate_cw(&mut pos, axis);
                
                let mut vx = Vec3 { x: mat.m[0][0], y: mat.m[0][1], z: mat.m[0][2] };
                let mut vy = Vec3 { x: mat.m[1][0], y: mat.m[1][1], z: mat.m[1][2] };
                let mut vz = Vec3 { x: mat.m[2][0], y: mat.m[2][1], z: mat.m[2][2] };
                
                rotate_cw(&mut vx, axis);
                rotate_cw(&mut vy, axis);
                rotate_cw(&mut vz, axis);

                mat.m[0][0] = vx.x; mat.m[0][1] = vx.y; mat.m[0][2] = vx.z;
                mat.m[1][0] = vy.x; mat.m[1][1] = vy.y; mat.m[1][2] = vy.z;
                mat.m[2][0] = vz.x; mat.m[2][1] = vz.y; mat.m[2][2] = vz.z;
            }
        }

        let new_q = mat.to_quat();

        out_data[i * 7] = pos.x;
        out_data[i * 7 + 1] = pos.y;
        out_data[i * 7 + 2] = pos.z;
        out_data[i * 7 + 3] = new_q[0];
        out_data[i * 7 + 4] = new_q[1];
        out_data[i * 7 + 5] = new_q[2];
        out_data[i * 7 + 6] = new_q[3];
    }

    out_data
}

/// Generate a valid scramble sequence of a given length
#[wasm_bindgen]
pub fn generate_scramble(length: usize) -> String {
    let faces = ["U", "D", "R", "L", "F", "B"];
    let modifiers = ["", "'", "2"];

    let mut scramble = Vec::new();
    let mut last_face = 255;
    let mut before_last_face = 255;

    for _ in 0..length {
        let mut face;
        loop {
            face = (js_sys::Math::random() * 6.0).floor() as usize;
            // Avoid repeating the same face (e.g. U U')
            if face == last_face {
                continue;
            }
            // Avoid sequences like U D U, where U and D are opposite faces
            // In our array: U=0, D=1 (opposites), R=2, L=3 (opposites), F=4, B=5 (opposites)
            if face == before_last_face && (face / 2 == last_face / 2) {
                continue;
            }
            break;
        }
        before_last_face = last_face;
        last_face = face;

        let modifier = (js_sys::Math::random() * 3.0).floor() as usize;
        let move_str = format!("{}{}", faces[face], modifiers[modifier]);
        scramble.push(move_str);
    }

    scramble.join(" ")
}
