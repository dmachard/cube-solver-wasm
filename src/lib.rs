use kewb::{CubieCube, DataTable, FaceCube, Solver};
use std::sync::OnceLock;
use wasm_bindgen::prelude::*;

// to store data in memory
// OnceLock is a thread-safe container that guarantees that the tables will only be calculated once
// at the very first call to the function
static SOLVER_TABLES: OnceLock<DataTable> = OnceLock::new();

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
