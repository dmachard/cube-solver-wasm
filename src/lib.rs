use kewb::{CubieCube, DataTable, FaceCube, Solver};
use std::sync::OnceLock;
use wasm_bindgen::prelude::*;

pub mod pyraminx;

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

/// Solve the Pyraminx state
#[wasm_bindgen]
pub fn solve_pyraminx(cube_string: &str) -> String {
    pyraminx::solve(cube_string)
}

/// Expose the package version defined in Cargo.toml at compile time
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
