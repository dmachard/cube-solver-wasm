use cube_solver_wasm::pyraminx::{apply_move, Move};
use cube_solver_wasm::solve_pyraminx;

#[test]
fn test_solved_pyraminx() {
    let solved = "UUUUUUUUULLLLLLLLLRRRRRRRRRBBBBBBBBB";
    let solution = solve_pyraminx(solved);
    assert_eq!(solution, "");
}

#[test]
fn test_user_reported_state() {
    // The user's manually painted state is rejected as "unreachable" by BFS.
    // This means PYRAMINX_FACE_MAPPINGS in constants.js is wrong.
    // Let's derive the correct mapping by analyzing each facelet's structural role.
    //
    // From the solver code, each face's 9 facelets have these roles:
    //
    // Face U (0-8): vertices are B(apex/v0), R(bottom-left/vb), L(bottom-right/vc)
    //   0=TipB, 1=EdgeLB, 2=CornerB, 3=EdgeRB, 4=TipL, 5=CornerL, 6=EdgeLR, 7=CornerR, 8=TipR
    //
    // The visual SVG subtriangle layout (for UP-pointing face):
    //   Row0: [0]=apex
    //   Row1: [1]=mid-left-up, [2]=mid-center-down, [3]=mid-right-up
    //   Row2: [4]=bot-left-up, [5]=bot-left-down, [6]=bot-center-up, [7]=bot-right-down, [8]=bot-right-up
    //
    // subdivideTriangle(va=B, vb=R, vc=L):
    //   visual[0]=apex=B, visual[4]=bottom-left=R, visual[8]=bottom-right=L
    //
    // Mapping visual→solver for Face U:
    //   vis0→idx0(TipB), vis1→idx3(EdgeRB), vis2→idx2(CornerB), vis3→idx1(EdgeLB)
    //   vis4→idx8(TipR), vis5→idx7(CornerR), vis6→idx6(EdgeLR), vis7→idx5(CornerL), vis8→idx4(TipL)
    //   = [0, 3, 2, 1, 8, 7, 6, 5, 4] ← current mapping, looks correct!
    //
    // For DOWN-pointing faces (L,R,B in SVG), flipY inverts the triangle:
    //   After flip: visual[0]=bottom=apex(va), visual[8]=top-left=vc, visual[4]=top-right=vb
    //   But the subtriangle ORDER doesn't change, only the Y coords flip.
    //   So visual[0] is still va (apex), visual[4] still maps to vb corner, visual[8] to vc corner.
    //
    // Face L (9-17): TETRA_FACES[1]=[v0,v3,v2] → va=B, vb=U, vc=R
    //   9=TipU, 10=EdgeUB, 11=CornerU, 12=EdgeUR, 13=TipB, 14=CornerB, 15=EdgeRB, 16=CornerR, 17=TipR
    //   subdivide(va=B, vb=U, vc=R): vis[0]=B, vis[4]=U, vis[8]=R
    //   vis0→idx13(TipB), vis1→?, vis2→idx14(CornerB), vis3→?, vis4→idx9(TipU), vis8→idx17(TipR)
    //
    //   For down-pointing: after flipY, vis[0] is at bottom=B, vis[4] at top-right=U, vis[8] at top-left=R
    //   Wait no - flipY just flips Y. The subdivision order remains the same.
    //   vis[0]=tip at va=B=idx13, vis[4]=tip at vb=U=idx9, vis[8]=tip at vc=R=idx17
    //   vis[1]=edge between B and U side=EdgeRB? No...
    //
    // Let me just verify by running actual moves:
    let solved = b"UUUUUUUUULLLLLLLLLRRRRRRRRRBBBBBBBBB";
    
    // Apply U move and check which facelets changed on each face
    let after_u = apply_move(solved, Move::U);
    eprintln!("After U: {}", std::str::from_utf8(&after_u).unwrap());
    
    // On face L (9-17), after U move, which indices changed?
    eprint!("Face L changes after U: ");
    for i in 9..18 {
        if after_u[i] != solved[i] { eprint!("{}={} ", i, after_u[i] as char); }
    }
    eprintln!();
    
    // Apply L move
    let after_l = apply_move(solved, Move::L);
    eprintln!("After L: {}", std::str::from_utf8(&after_l).unwrap());
    eprint!("Face L changes after L: ");
    for i in 9..18 {
        if after_l[i] != solved[i] { eprint!("{}={} ", i, after_l[i] as char); }
    }
    eprintln!();
    
    // Apply R move
    let after_r = apply_move(solved, Move::R);
    eprintln!("After R: {}", std::str::from_utf8(&after_r).unwrap());
    
    // Apply B move
    let after_b = apply_move(solved, Move::B);
    eprintln!("After B: {}", std::str::from_utf8(&after_b).unwrap());

    // Print which indices changed per face for each move
    for (name, state) in [("U", &after_u), ("L", &after_l), ("R", &after_r), ("B", &after_b)] {
        eprintln!("\nMove {} changes:", name);
        for face in 0..4 {
            let face_name = ["U","L","R","B"][face];
            let start = face * 9;
            let changes: Vec<String> = (start..start+9)
                .filter(|&i| state[i] != solved[i])
                .map(|i| format!("[{}]={}", i, state[i] as char))
                .collect();
            if !changes.is_empty() {
                eprintln!("  Face {}: {}", face_name, changes.join(", "));
            }
        }
    }
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
        _ => next,
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
    assert_eq!(
        &check_state, solved,
        "Solution '{}' failed to solve scramble '{}'",
        solution, scrambled_str
    );
}
