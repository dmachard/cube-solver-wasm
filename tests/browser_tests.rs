use cube_solver_wasm::generate_scramble;
use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_generate_scramble_wasm() {
    let scramble = generate_scramble(20);
    // Should return a string of length > 0
    assert!(scramble.len() > 0);
    // Should have exactly 19 spaces for 20 moves
    assert_eq!(scramble.split(' ').count(), 20);
}

#[wasm_bindgen_test]
fn test_is_valid_state_wasm() {
    use cube_solver_wasm::is_valid_state;
    let solved = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
    assert!(is_valid_state(solved));

    let invalid = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBC";
    assert!(!is_valid_state(invalid));
}
