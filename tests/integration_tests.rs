use cube_solver_wasm::solve;

#[test]
fn test_solved_cube() {
    let solved = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
    let solution = solve(solved);
    // A solved cube should require 0 moves (empty string)
    assert_eq!(solution, "");
}

#[test]
fn test_invalid_cube_string() {
    let invalid = "INVALID_CUBE_STRING";
    let solution = solve(invalid);
    assert!(solution.contains("Error: Invalid string format."));
}

#[test]
fn test_invalid_cube_facets() {
    // A string of 54 characters but with invalid/impossible facelet count or setup
    let invalid_facets = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBC";
    let solution = solve(invalid_facets);
    assert!(
        solution.contains("Error: Invalid string format.")
            || solution.contains("Error: Invalid configuration")
    );
}

#[test]
fn test_is_valid_state_true() {
    let solved = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
    assert!(cube_solver_wasm::is_valid_state(solved));
}

#[test]
fn test_is_valid_state_false_invalid_char() {
    let invalid = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBC";
    assert!(!cube_solver_wasm::is_valid_state(invalid));
}

#[test]
fn test_is_valid_state_false_impossible_geometry() {
    // A cube with 9 of each color, but one corner twisted (impossible to solve)
    // To do this simply, we can just take a solved string and swap two corners' colors.
    // Or simpler: F and B centers swapped (also impossible, centers are fixed normally, but let's just make an impossible edge)
    // Here we swap a U and R sticker on an edge to create a flipped edge parity.
    let mut chars: Vec<char> = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB".chars().collect();
    chars.swap(5, 10); // Swap U right edge with R top edge
    let impossible: String = chars.into_iter().collect();
    assert!(!cube_solver_wasm::is_valid_state(&impossible));
}

