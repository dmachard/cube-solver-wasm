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

#[test]
fn test_extract_state_from_3d() {
    let mut positions = Vec::new();
    let mut quaternions = Vec::new();
    let mut face_colors = String::new();

    let solved_state = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
    let state_chars: Vec<char> = solved_state.chars().collect();

    for x in -1..=1 {
        for y in -1..=1 {
            for z in -1..=1 {
                if x == 0 && y == 0 && z == 0 {
                    continue;
                }

                positions.push(x as f32);
                positions.push(y as f32);
                positions.push(z as f32);

                quaternions.push(0.0);
                quaternions.push(0.0);
                quaternions.push(0.0);
                quaternions.push(1.0); // Identity quaternion

                // Determine the colors for the 6 faces: Right(+x), Left(-x), Up(+y), Down(-y), Front(+z), Back(-z)
                for mat_idx in 0..6 {
                    let mut color_char = 'X'; // Default internal color

                    if mat_idx == 0 && x == 1 {
                        let facelet_index = 9 + (2 - (y + 1)) * 3 + (2 - (z + 1));
                        color_char = state_chars[facelet_index as usize];
                    } else if mat_idx == 1 && x == -1 {
                        let facelet_index = 36 + (2 - (y + 1)) * 3 + (z + 1);
                        color_char = state_chars[facelet_index as usize];
                    } else if mat_idx == 2 && y == 1 {
                        let facelet_index = 0 + (z + 1) * 3 + (x + 1);
                        color_char = state_chars[facelet_index as usize];
                    } else if mat_idx == 3 && y == -1 {
                        let facelet_index = 27 + (2 - (z + 1)) * 3 + (x + 1);
                        color_char = state_chars[facelet_index as usize];
                    } else if mat_idx == 4 && z == 1 {
                        let facelet_index = 18 + (2 - (y + 1)) * 3 + (x + 1);
                        color_char = state_chars[facelet_index as usize];
                    } else if mat_idx == 5 && z == -1 {
                        let facelet_index = 45 + (2 - (y + 1)) * 3 + (2 - (x + 1));
                        color_char = state_chars[facelet_index as usize];
                    }

                    face_colors.push(color_char);
                }
            }
        }
    }

    let result = cube_solver_wasm::extract_state_from_3d(&positions, &quaternions, &face_colors);
    assert_eq!(result, solved_state);
}

#[test]
fn test_calculate_rotation_target() {
    let mut positions = Vec::new();
    let mut quaternions = Vec::new();

    for x in -1..=1 {
        for y in -1..=1 {
            for z in -1..=1 {
                if x == 0 && y == 0 && z == 0 {
                    continue;
                }
                positions.push(x as f32);
                positions.push(y as f32);
                positions.push(z as f32);

                quaternions.push(0.0);
                quaternions.push(0.0);
                quaternions.push(0.0);
                quaternions.push(1.0); // Identity quaternion
            }
        }
    }

    // Apply "U" move (rotate Y=1 slice clockwise by -90 deg around Y)
    let target = cube_solver_wasm::calculate_rotation_target(&positions, &quaternions, "U");

    let mut idx_111 = 0;
    for i in 0..26 {
        if positions[i * 3] == 1.0 && positions[i * 3 + 1] == 1.0 && positions[i * 3 + 2] == 1.0 {
            idx_111 = i;
            break;
        }
    }

    // (1, 1, 1) -> (-1, 1, 1)
    let target_x = target[idx_111 * 7];
    let target_y = target[idx_111 * 7 + 1];
    let target_z = target[idx_111 * 7 + 2];

    assert_eq!(target_x, -1.0);
    assert_eq!(target_y, 1.0);
    assert_eq!(target_z, 1.0);

    let mut idx_bottom = 0;
    for i in 0..26 {
        if positions[i * 3] == 1.0 && positions[i * 3 + 1] == -1.0 && positions[i * 3 + 2] == 1.0 {
            idx_bottom = i;
            break;
        }
    }

    let target_bx = target[idx_bottom * 7];
    let target_by = target[idx_bottom * 7 + 1];
    let target_bz = target[idx_bottom * 7 + 2];
    assert_eq!(target_bx, 1.0);
    assert_eq!(target_by, -1.0);
    assert_eq!(target_bz, 1.0);
}

