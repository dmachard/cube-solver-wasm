use cube_solver_wasm::solve_pyraminx;
use cube_solver_wasm::pyraminx::{apply_move, Move};

#[test]
fn test_solved_pyraminx() {
    let solved = "UUUUUUUUULLLLLLLLLRRRRRRRRRBBBBBBBBB";
    let solution = solve_pyraminx(solved);
    assert_eq!(solution, "");
}

#[test]
fn test_invalid_pyraminx_string() {
    let invalid = "SHORT";
    let solution = solve_pyraminx(invalid);
    assert!(solution.contains("Error: Invalid string format."));
}

fn apply_move_str(state: &[u8; 36], mv: &str) -> [u8; 36] {
    let mut next = *state;
    match mv {
        "U" => apply_move(state, Move::U),
        "U'" => apply_move(state, Move::Up),
        "L" => apply_move(state, Move::L),
        "L'" => apply_move(state, Move::Lp),
        "R" => apply_move(state, Move::R),
        "R'" => apply_move(state, Move::Rp),
        "B" => apply_move(state, Move::B),
        "B'" => apply_move(state, Move::Bp),
        // Tip-only moves (affect only tip facelets)
        "u" => {
            next[27] = state[9];
            next[18] = state[27];
            next[9] = state[18];
            next
        }
        "u'" => {
            next = apply_move_str(state, "u");
            next = apply_move_str(&next, "u");
            next
        }
        "l" => {
            next[22] = state[4];
            next[31] = state[22];
            next[4] = state[31];
            next
        }
        "l'" => {
            next = apply_move_str(state, "l");
            next = apply_move_str(&next, "l");
            next
        }
        "r" => {
            next[35] = state[8];
            next[17] = state[35];
            next[8] = state[17];
            next
        }
        "r'" => {
            next = apply_move_str(state, "r");
            next = apply_move_str(&next, "r");
            next
        }
        "b" => {
            next[26] = state[0];
            next[13] = state[26];
            next[0] = state[13];
            next
        }
        "b'" => {
            next = apply_move_str(state, "b");
            next = apply_move_str(&next, "b");
            next
        }
        _ => next
    }
}

#[test]
fn test_pyraminx_moves_and_scrambles() {
    let solved = b"UUUUUUUUULLLLLLLLLRRRRRRRRRBBBBBBBBB";

    // 1. Test single core moves and their solutions
    let state_u = apply_move(solved, Move::U);
    let state_u_str = std::str::from_utf8(&state_u).unwrap();
    let sol_u = solve_pyraminx(state_u_str);
    assert_eq!(sol_u, "U'");

    let state_l = apply_move(solved, Move::L);
    let state_l_str = std::str::from_utf8(&state_l).unwrap();
    let sol_l = solve_pyraminx(state_l_str);
    assert_eq!(sol_l, "L'");

    // 2. Test a complex scramble including tips
    // Let's scramble the core
    let mut state = *solved;
    state = apply_move(&state, Move::U);
    state = apply_move(&state, Move::L);
    state = apply_move(&state, Move::Rp);
    state = apply_move(&state, Move::B);

    // Let's twist some tips independently
    // twist tip u counter-clockwise (so state[9]=state[27_old]=state[18_older] etc)
    state = apply_move_str(&state, "u'");
    // twist tip r clockwise
    state = apply_move_str(&state, "r");

    let scrambled_str = std::str::from_utf8(&state).unwrap();
    let solution = solve_pyraminx(scrambled_str);
    assert!(!solution.contains("Error"));

    // Verify the generated solution solves the Pyraminx back to the solved state
    let mut check_state = state;
    for mv in solution.split_whitespace() {
        check_state = apply_move_str(&check_state, mv);
    }
    assert_eq!(&check_state, solved, "Solution '{}' failed to solve scramble '{}'", solution, scrambled_str);
}
