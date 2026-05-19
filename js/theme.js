import { COLOR_HEX_MAP } from './constants.js';
import { translations, updateDOMTranslations } from './i18n.js';
import { build3DCube } from './visualizer.js';

export const schemes = {
    standard: {
        'U': '#ffffff',
        'L': '#f97316',
        'F': '#10b981',
        'R': '#ef4444',
        'B': '#2563eb',
        'D': '#ffea00',
        borderU: '#cbd5e1'
    },
    custom: {
        'U': '#ff6baf', // Pink / Rose
        'L': '#f97316', // Orange
        'F': '#10b981', // Green / Vert
        'R': '#8b5cf6', // Purple / Violet
        'B': '#2563eb', // Blue / Bleu
        'D': '#ffea00', // Yellow / Jaune
        borderU: 'transparent'
    }
};

export let currentScheme = 'standard';

export function setThemeScheme(schemeName) {
    if (!schemes[schemeName]) return;
    currentScheme = schemeName;
    localStorage.setItem('cube-solver-scheme', schemeName);

    const scheme = schemes[schemeName];
    
    // 1. Update global COLOR_HEX_MAP (for Three.js)
    for (const key of ['U', 'L', 'F', 'R', 'B', 'D']) {
        COLOR_HEX_MAP[key] = scheme[key];
    }

    // 2. Update CSS Variables (for 2D net and palette background)
    const root = document.documentElement;
    root.style.setProperty('--color-u', scheme['U']);
    root.style.setProperty('--color-l', scheme['L']);
    root.style.setProperty('--color-f', scheme['F']);
    root.style.setProperty('--color-r', scheme['R']);
    root.style.setProperty('--color-b', scheme['B']);
    root.style.setProperty('--color-d', scheme['D']);
    root.style.setProperty('--border-u', scheme.borderU || (schemeName === 'custom' ? 'transparent' : '#cbd5e1'));

    // 3. Update dynamic color names in translations
    if (schemeName === 'custom') {
        translations.en['color-white'] = 'Custom U';
        translations.en['color-red'] = 'Custom R';
        translations.en['color-u-desc'] = 'Custom U';
        translations.en['color-r-desc'] = 'Custom R';
        translations.en['face-u-desc'] = 'Up (Custom)';
        translations.en['face-r-desc'] = 'Right (Custom)';

        translations.fr['color-white'] = 'Perso U';
        translations.fr['color-red'] = 'Perso R';
        translations.fr['color-u-desc'] = 'Perso U';
        translations.fr['color-r-desc'] = 'Perso R';
        translations.fr['face-u-desc'] = 'Haut (Perso)';
        translations.fr['face-r-desc'] = 'Droite (Perso)';
    } else {
        translations.en['color-white'] = 'White';
        translations.en['color-red'] = 'Red';
        translations.en['color-u-desc'] = 'White (Up / U)';
        translations.en['color-r-desc'] = 'Red (Right / R)';
        translations.en['face-u-desc'] = 'Up (White)';
        translations.en['face-r-desc'] = 'Right (Red)';

        translations.fr['color-white'] = 'Blanc';
        translations.fr['color-red'] = 'Rouge';
        translations.fr['color-u-desc'] = 'Blanc (Haut / U)';
        translations.fr['color-r-desc'] = 'Rouge (Droite / R)';
        translations.fr['face-u-desc'] = 'Haut (Blanc)';
        translations.fr['face-r-desc'] = 'Droite (Rouge)';
    }

    // Show/hide custom color configurator panel
    const configPanel = document.getElementById("custom-theme-config");
    if (configPanel) {
        if (schemeName === "custom") {
            configPanel.classList.remove("hidden");
        } else {
            configPanel.classList.add("hidden");
        }
    }

    // 4. Update the DOM elements with translations
    updateDOMTranslations();

    // 5. Rebuild 3D cube model with new material colors (if scene is initialized)
    try {
        build3DCube();
    } catch (e) {
        // Scene might not be fully initialized yet on startup
    }
}

export function initThemeScheme() {
    // Load custom colors from localStorage if saved
    const savedColors = localStorage.getItem('cube-solver-custom-colors');
    if (savedColors) {
        try {
            const parsed = JSON.parse(savedColors);
            for (const key of ['U', 'L', 'F', 'R', 'B', 'D']) {
                if (parsed[key]) {
                    schemes.custom[key] = parsed[key];
                }
            }
        } catch (e) {
            console.error("Failed to parse custom colors:", e);
        }
    }

    // Initialize picker values and setup input event listeners
    const keys = ['U', 'L', 'F', 'R', 'B', 'D'];
    keys.forEach(key => {
        const picker = document.getElementById(`picker-${key.toLowerCase()}`);
        if (picker) {
            picker.value = schemes.custom[key];
            
            // Set initial color dot backgrounds
            const dot = picker.parentElement.querySelector(".color-dot");
            if (dot) {
                dot.style.backgroundColor = schemes.custom[key];
            }

            picker.addEventListener("input", (e) => {
                const newColor = e.target.value;
                schemes.custom[key] = newColor;
                localStorage.setItem('cube-solver-custom-colors', JSON.stringify(schemes.custom));
                
                // Update color dot in config row
                if (dot) {
                    dot.style.backgroundColor = newColor;
                }

                // Apply live updates if currently using custom scheme
                if (currentScheme === 'custom') {
                    setThemeScheme('custom');
                }
            });
        }
    });

    const savedScheme = localStorage.getItem('cube-solver-scheme');
    if (savedScheme && schemes[savedScheme]) {
        currentScheme = savedScheme;
    }
    const select = document.getElementById('theme-select');
    if (select) {
        select.value = currentScheme;
    }
    setThemeScheme(currentScheme);
}
