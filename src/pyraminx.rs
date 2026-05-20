use std::sync::OnceLock;

static PYRAMINX_TABLE: OnceLock<Vec<u8>> = OnceLock::new();

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Move {
    U, Up,
    L, Lp,
    R, Rp,
    B, Bp,
}

const MOVE_LIST: [Move; 8] = [
    Move::U, Move::Up,
    Move::L, Move::Lp,
    Move::R, Move::Rp,
    Move::B, Move::Bp,
];

/// Applies a clockwise or counter-clockwise corner rotation to the 36-facelet state
pub fn apply_move(state: &[u8; 36], mv: Move) -> [u8; 36] {
    let mut next = *state;
    match mv {
        Move::U => {
            // Tips: 27 -> 18 -> 9 -> 27
            next[27] = state[9];
            next[18] = state[27];
            next[9] = state[18];
            // Corners: 29 -> 20 -> 11 -> 29
            next[29] = state[11];
            next[20] = state[29];
            next[11] = state[20];
            // UB to UR
            next[30] = state[10];
            next[12] = state[21];
            // UR to UL
            next[19] = state[30];
            next[28] = state[12];
            // UL to UB
            next[21] = state[28];
            next[10] = state[19];
        }
        Move::Up => {
            next = apply_move(state, Move::U);
            next = apply_move(&next, Move::U);
        }
        Move::L => {
            // Tips: 22 -> 31 -> 4 -> 22
            next[22] = state[4];
            next[31] = state[22];
            next[4] = state[31];
            // Corners: 23 -> 32 -> 5 -> 23
            next[23] = state[5];
            next[32] = state[23];
            next[5] = state[32];
            // UL to LB
            next[24] = state[28];
            next[1] = state[19];
            // LB to LR
            next[33] = state[1];
            next[6] = state[24];
            // LR to UL
            next[28] = state[6];
            next[19] = state[33];
        }
        Move::Lp => {
            next = apply_move(state, Move::L);
            next = apply_move(&next, Move::L);
        }
        Move::R => {
            // Tips: 35 -> 17 -> 8 -> 35
            next[35] = state[8];
            next[17] = state[35];
            next[8] = state[17];
            // Corners: 34 -> 16 -> 7 -> 34
            next[34] = state[7];
            next[16] = state[34];
            next[7] = state[16];
            // UR to RB
            next[3] = state[12];
            next[15] = state[30];
            // RB to LR
            next[33] = state[3];
            next[6] = state[15];
            // LR to UR
            next[30] = state[6];
            next[12] = state[33];
        }
        Move::Rp => {
            next = apply_move(state, Move::R);
            next = apply_move(&next, Move::R);
        }
        Move::B => {
            // Tips: 26 -> 13 -> 0 -> 26
            next[26] = state[0];
            next[13] = state[26];
            next[0] = state[13];
            // Corners: 25 -> 14 -> 2 -> 25
            next[25] = state[2];
            next[14] = state[25];
            next[2] = state[14];
            // UB to RB
            next[3] = state[10];
            next[15] = state[21];
            // RB to LB
            next[24] = state[3];
            next[1] = state[15];
            // LB to UB
            next[21] = state[1];
            next[10] = state[24];
        }
        Move::Bp => {
            next = apply_move(state, Move::B);
            next = apply_move(&next, Move::B);
        }
    }
    next
}

fn get_piece_index(c1: u8, c2: u8) -> Option<u8> {
    let mut colors = [c1, c2];
    colors.sort();
    match colors {
        [b'B', b'R'] => Some(0), // Green ('R') and Red ('B')
        [b'B', b'L'] => Some(1), // Blue ('L') and Red ('B')
        [b'L', b'R'] => Some(2), // Blue ('L') and Green ('R')
        [b'B', b'U'] => Some(3), // Yellow ('U') and Red ('B')
        [b'R', b'U'] => Some(4), // Yellow ('U') and Green ('R')
        [b'L', b'U'] => Some(5), // Yellow ('U') and Blue ('L')
        _ => None,
    }
}

const PIECE_PRIMARY_COLOR: [u8; 6] = [
    b'R', // Piece 0: Green/Red (normally UL)
    b'L', // Piece 1: Blue/Red (normally UR)
    b'L', // Piece 2: Blue/Green (normally UB)
    b'U', // Piece 3: Yellow/Red (normally LR)
    b'U', // Piece 4: Yellow/Green (normally LB)
    b'U', // Piece 5: Yellow/Blue (normally RB)
];

fn get_edge_orientation(piece: u8, color_at_primary: u8) -> u8 {
    if color_at_primary == PIECE_PRIMARY_COLOR[piece as usize] {
        0
    } else {
        1
    }
}

fn permutation_to_index(perm: &[u8; 6]) -> usize {
    let mut index = 0;
    for i in 0..6 {
        let mut count = 0;
        for j in i+1..6 {
            if perm[j] < perm[i] {
                count += 1;
            }
        }
        let mut factor = 1;
        for k in 1..(6 - i) {
            factor *= k;
        }
        index += count * factor;
    }
    index
}

/// Maps the 36-facelet state to a unique index in 0..3,732,480
pub fn get_core_state_index(state: &[u8; 36]) -> Option<usize> {
    // 1. Corner orientations
    let c0 = match state[11] { b'L' => Some(0), b'R' => Some(1), b'B' => Some(2), _ => None }?;
    let c1 = match state[5]  { b'U' => Some(0), b'B' => Some(1), b'R' => Some(2), _ => None }?;
    let c2 = match state[7]  { b'U' => Some(0), b'L' => Some(1), b'B' => Some(2), _ => None }?;
    let c3 = match state[2]  { b'U' => Some(0), b'L' => Some(1), b'R' => Some(2), _ => None }?;
    let corner_idx = c0 + c1 * 3 + c2 * 9 + c3 * 27; // 0..81

    // 2. Edge permutation
    let mut edges_pos = [0u8; 6];
    edges_pos[0] = get_piece_index(state[19], state[28])?;
    edges_pos[1] = get_piece_index(state[12], state[30])?;
    edges_pos[2] = get_piece_index(state[10], state[21])?;
    edges_pos[3] = get_piece_index(state[6], state[33])?;
    edges_pos[4] = get_piece_index(state[1], state[24])?;
    edges_pos[5] = get_piece_index(state[3], state[15])?;

    let mut seen = 0u8;
    for &p in &edges_pos {
        if p >= 6 { return None; }
        seen |= 1 << p;
    }
    if seen != 0b111111 { return None; }

    let edge_perm_idx = permutation_to_index(&edges_pos); // 0..720

    // 3. Edge orientations
    let o0 = get_edge_orientation(edges_pos[0], state[19]);
    let o1 = get_edge_orientation(edges_pos[1], state[12]);
    let o2 = get_edge_orientation(edges_pos[2], state[10]);
    let o3 = get_edge_orientation(edges_pos[3], state[6]);
    let o4 = get_edge_orientation(edges_pos[4], state[1]);
    let o5 = get_edge_orientation(edges_pos[5], state[3]);
    let edge_ori_idx = o0 + o1 * 2 + o2 * 4 + o3 * 8 + o4 * 16 + o5 * 32; // 0..64

    Some(corner_idx * (720 * 64) + edge_perm_idx * 64 + edge_ori_idx as usize)
}

/// Generates the pruning/distance table using BFS from the solved state
fn init_pyraminx_table() -> Vec<u8> {
    let mut table = vec![255u8; 3_732_480];
    let solved_state = b"UUUUUUUUULLLLLLLLLRRRRRRRRRBBBBBBBBB";
    let solved_idx = get_core_state_index(solved_state).unwrap();
    table[solved_idx] = 0;

    let mut queue = std::collections::VecDeque::new();
    queue.push_back((*solved_state, solved_idx));

    while let Some((state, idx)) = queue.pop_front() {
        let dist = table[idx];
        for mv in &MOVE_LIST {
            let next_state = apply_move(&state, *mv);
            if let Some(next_idx) = get_core_state_index(&next_state) {
                if table[next_idx] == 255 {
                    table[next_idx] = dist + 1;
                    queue.push_back((next_state, next_idx));
                }
            }
        }
    }
    table
}

/// Solves the Pyraminx state and returns the optimal sequence of moves as a space-separated string
pub fn solve(cube_string: &str) -> String {
    if cube_string.len() != 36 {
        return "Error: Invalid string format.".to_string();
    }

    let mut state = [0u8; 36];
    state.copy_from_slice(cube_string.as_bytes());

    // 1. Solve the 4 independent tips first
    let mut tip_moves = Vec::new();

    // Tip U: facelets 9, 18, 27. Corner U on Face L is 11.
    if state[9] != state[11] {
        if state[18] == state[11] {
            tip_moves.push("u");
        } else if state[27] == state[11] {
            tip_moves.push("u'");
        } else {
            return "Error: Invalid configuration (invalid facets).".to_string();
        }
    }

    // Tip L: facelets 4, 22, 31. Corner L on Face U is 5.
    if state[4] != state[5] {
        if state[31] == state[5] {
            tip_moves.push("l");
        } else if state[22] == state[5] {
            tip_moves.push("l'");
        } else {
            return "Error: Invalid configuration (invalid facets).".to_string();
        }
    }

    // Tip R: facelets 8, 17, 35. Corner R on Face U is 7.
    if state[8] != state[7] {
        if state[17] == state[7] {
            tip_moves.push("r");
        } else if state[35] == state[7] {
            tip_moves.push("r'");
        } else {
            return "Error: Invalid configuration (invalid facets).".to_string();
        }
    }

    // Tip B: facelets 0, 13, 26. Corner B on Face U is 2.
    if state[0] != state[2] {
        if state[13] == state[2] {
            tip_moves.push("b");
        } else if state[26] == state[2] {
            tip_moves.push("b'");
        } else {
            return "Error: Invalid configuration (invalid facets).".to_string();
        }
    }

    // 2. Solve the core using the distance table
    let table = PYRAMINX_TABLE.get_or_init(init_pyraminx_table);
    let core_idx = match get_core_state_index(&state) {
        Some(idx) => idx,
        None => return "Error: Invalid configuration (invalid facets).".to_string(),
    };

    let distance = table[core_idx];
    if distance == 255 {
        return "Error: Invalid configuration (invalid facets).".to_string();
    }

    let mut curr_idx = core_idx;
    let mut curr_state = state;
    let mut core_moves = Vec::new();

    while table[curr_idx] > 0 {
        let curr_dist = table[curr_idx];
        let mut moved = false;
        for mv in &MOVE_LIST {
            let next_state = apply_move(&curr_state, *mv);
            if let Some(next_idx) = get_core_state_index(&next_state) {
                if table[next_idx] == curr_dist - 1 {
                    core_moves.push(match mv {
                        Move::U => "U",
                        Move::Up => "U'",
                        Move::L => "L",
                        Move::Lp => "L'",
                        Move::R => "R",
                        Move::Rp => "R'",
                        Move::B => "B",
                        Move::Bp => "B'",
                    });
                    curr_idx = next_idx;
                    curr_state = next_state;
                    moved = true;
                    break;
                }
            }
        }
        if !moved {
            return "Error: Solver error.".to_string();
        }
    }

    // Combine tip moves and core moves
    let mut all_moves = tip_moves;
    all_moves.extend(core_moves);
    all_moves.join(" ")
}
