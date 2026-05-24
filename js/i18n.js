export const translations = {
    en: {
        title: "Rubik's Solver",
        "title-desc": "3D Rubik's Cube Solver",
        "2d-config": "Cube Configuration",
        "2d-desc": "Select a color below and paint directly on the 3D cube to match your physical cube's state.",
        "select-face": "Select face to edit:",
        "select-color": "Select color:",
        "reset-solved": "🗑️ Reset to Solved",
        "random-scramble": "🎲 Random Scramble",
        "solve-cube": "Solve Cube",
        "solving": "Solving with Rust...",
        "3d-visualizer": "3D Visualizer",
        "3d-desc": "Interact with the 3D model. Rotate, zoom, and play the solving moves.",
        "wasm-loading": "Loading Rust/WASM Engine...",
        "wasm-loaded": "✓ WASM Rust Engine loaded successfully.",
        "wasm-failed": "Failed to load WASM engine. Check console errors.",
        "wasm-ready": "✓ Exactly 9 squares per color.",
        "solution-found": "✓ Solution found!",
        "invalid-counts": "⚠️ Invalid counts: ",
        "invalid-geometry": "⚠️ Impossible geometry (flipped edge/corner)",
        "squares": "squares",
        "fixed-center": "Fixed center:",
        "built-with": "📦 Built with Rust, WebAssembly and Three.js | ",
        "made-by": "Made by",
        "vibe-coded": "vibe coded",
        "unexpected-error": "An unexpected error occurred.",
        "scheme-standard": "Standard Colors",
        "scheme-custom": "Custom Colors",
        "custom-colors-title": "Customize colors:",
        "view-single": "Face by Face",
        "view-unfolded": "Unfolded Net",

        // Colors
        "color-white": "White",
        "color-orange": "Orange",
        "color-green": "Green",
        "color-red": "Red",
        "color-blue": "Blue",
        "color-yellow": "Yellow",

        // Faces
        "face-u": "Up",
        "face-l": "Left",
        "face-f": "Front",
        "face-r": "Right",
        "face-b": "Back",
        "face-d": "Down",

        // Tooltips
        "face-u-desc": "Up (White)",
        "face-l-desc": "Left (Orange)",
        "face-f-desc": "Front (Green)",
        "face-r-desc": "Right (Red)",
        "face-b-desc": "Back (Blue)",
        "face-d-desc": "Down (Yellow)",

        "color-u-desc": "White (Up / U)",
        "color-l-desc": "Orange (Left / L)",
        "color-f-desc": "Green (Front / F)",
        "color-r-desc": "Red (Right / R)",
        "color-b-desc": "Blue (Back / B)",
        "color-d-desc": "Yellow (Down / D)"
    },
    fr: {
        title: "Solveur Rubik's",
        "title-desc": "Solveur de Rubik's Cube 3D",
        "2d-config": "Configuration du Cube",
        "2d-desc": "Sélectionnez une couleur ci-dessous et peignez directement sur le cube 3D pour reproduire l'état de votre cube physique.",
        "select-face": "Sélectionner la face à éditer :",
        "select-color": "Sélectionner la couleur :",
        "reset-solved": "🗑️ Réinitialiser",
        "random-scramble": "🎲 Mélange aléatoire",
        "solve-cube": "Résoudre le cube",
        "solving": "Résolution en cours...",
        "3d-visualizer": "Visualisateur 3D",
        "3d-desc": "Interagissez avec le modèle 3D. Pivotez, zoomez et lisez les mouvements de résolution.",
        "wasm-loading": "Chargement du moteur Rust/WASM...",
        "wasm-loaded": "✓ Moteur WASM Rust chargé avec succès.",
        "wasm-failed": "Échec du chargement du moteur WASM. Vérifiez les erreurs de la console.",
        "wasm-ready": "✓ Exactement 9 carrés par couleur.",
        "solution-found": "✓ Solution trouvée !",
        "invalid-counts": "⚠️ Nombre incorrect : ",
        "invalid-geometry": "⚠️ Géométrie impossible (arête ou coin inversé)",
        "squares": "carrés",
        "fixed-center": "Centre fixe :",
        "built-with": "📦 Construit avec Rust, WebAssembly et Three.js | ",
        "made-by": "Créé par",
        "vibe-coded": "codé au feeling",
        "unexpected-error": "Une erreur inattendue est survenue.",
        "scheme-standard": "Couleurs standards",
        "scheme-custom": "Couleurs persos",
        "custom-colors-title": "Personnaliser les couleurs :",
        "view-single": "Face par face",
        "view-unfolded": "Patron déplié",

        // Colors
        "color-white": "Blanc",
        "color-orange": "Orange",
        "color-green": "Vert",
        "color-red": "Rouge",
        "color-blue": "Bleu",
        "color-yellow": "Jaune",

        // Faces
        "face-u": "Haut",
        "face-l": "Gauche",
        "face-f": "Devant",
        "face-r": "Droite",
        "face-b": "Arrière",
        "face-d": "Bas",

        // Tooltips
        "face-u-desc": "Haut (Blanc)",
        "face-l-desc": "Gauche (Orange)",
        "face-f-desc": "Devant (Vert)",
        "face-r-desc": "Droite (Rouge)",
        "face-b-desc": "Arrière (Bleu)",
        "face-d-desc": "Bas (Jaune)",

        "color-u-desc": "Blanc (Haut / U)",
        "color-l-desc": "Orange (Gauche / L)",
        "color-f-desc": "Vert (Devant / F)",
        "color-r-desc": "Rouge (Droite / R)",
        "color-b-desc": "Bleu (Arrière / B)",
        "color-d-desc": "Jaune (Bas / D)"
    }
};

export let currentLang = 'en';

export function setLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('cube-solver-lang', lang);
        updateDOMTranslations();
    }
}

export function initLanguage() {
    const savedLang = localStorage.getItem('cube-solver-lang');
    if (savedLang && translations[savedLang]) {
        currentLang = savedLang;
    } else {
        const browserLang = navigator.language.slice(0, 2);
        if (translations[browserLang]) {
            currentLang = browserLang;
        }
    }

    // Set the select element's value
    const select = document.getElementById('lang-select');
    if (select) {
        select.value = currentLang;
    }

    updateDOMTranslations();
}

export function t(key) {
    return translations[currentLang][key] || key;
}

export function updateDOMTranslations() {
    // 1. Update elements with data-i18n key
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.dataset.i18n;
        const text = t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = text;
        } else if (el.classList.contains('btn-primary') || el.id === 'btn-solve') {
            // Update the span inside btn-primary
            const btnText = el.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = text;
            } else {
                el.textContent = text;
            }
        } else {
            // Keep child elements if any, or just set textContent if text-only
            if (el.children.length === 0) {
                el.textContent = text;
            } else {
                // If it has children, update the first text node
                let node = el.firstChild;
                while (node) {
                    if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
                        node.nodeValue = text;
                        break;
                    }
                    node = node.nextSibling;
                }
            }
        }
    });

    // 2. Update tooltips and attributes
    const tooltipped = document.querySelectorAll('[data-i18n-title]');
    tooltipped.forEach(el => {
        const key = el.dataset.i18nTitle;
        el.title = t(key);
    });

    // 3. Document title
    document.title = t("title-desc");
}
