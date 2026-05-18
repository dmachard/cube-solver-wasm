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
    assert!(solution.contains("Error: Invalid string format.") || solution.contains("Error: Invalid configuration"));
}
