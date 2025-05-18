
import * as Config from './config.js';
import * as DOM from './dom-elements.js';
import * as State from './state.js';
import * as UI from './ui-interactions.js'; // UI इंटरेक्शन फ़ंक्शंस
import * as PieceManager from './piece-manager.js';
import * as Layout from './layout-calculator.js';
import *  as Display from './display-utils.js';
import * as OffcutManager from './offcut-manager.js';
import * as ExportPrint from './export-print.js';
// प्रोजेक्ट और हिस्ट्री के लिए भी इम्पोर्ट करें यदि उनके अपने मॉड्यूल हैं

// getLangString को यहाँ रखें या config.js से इम्पोर्ट करें यदि langStrings वहीं हैं
export function getLangString(key, replacements = {}) { 
    let str = (Config.langStrings[State.currentLanguage] && Config.langStrings[State.currentLanguage][key]) || `[[${key}]]`; 
    for (const placeholder in replacements) { str = str.replace(`{${placeholder}}`, replacements[placeholder]); } 
    return str; 
}

export function setLanguage(lang) { 
    State.setCurrentLanguage(lang); // अवस्था अपडेट करें
    if(document.documentElement) document.documentElement.lang = lang;
    const elements = document.querySelectorAll('[data-lang-key]');
    elements.forEach(el => { /* ... (आपका मौजूदा setLanguage DOM लॉजिक) ... */ });
    DOM.updateUnitDisplaysDOM(State.currentUnit); 
    PieceManager.renderPiecesTable(); // पीस टेबल को फिर से रेंडर करें
    // अन्य UI अपडेट जो भाषा पर निर्भर करते हैं
    if (DOM.historyModalEl && DOM.historyModalEl.style.display === 'flex') UI.showHistoryModal(); // UI से showHistoryModal को कॉल करें
    // ... (अन्य मोडल री-रेंडरिंग)
    if (State.lastCalculatedSheetsData && State.lastCalculatedSheetsData.length > 0) {
        Display.displayLayoutOnCanvas(State.lastCalculatedSheetsData);
    } else if ((!State.pieces || State.pieces.length === 0) && DOM.resultsSummaryEl) {
        // ...
    }
    localStorage.setItem(Config.STORAGE_KEY_LANGUAGE, lang);
}


function initializeApp() {
    DOM.cacheDOMElements();
    
    // ऑफकट और अन्य सेटिंग्स लोड करें
    State.loadSavedOffcuts(); 
    State.loadOffcutSettings(); 

    // UI इवेंट श्रोता यहाँ या ui-interactions.js में जोड़ें
    // उदाहरण:
    DOM.fittingStrategySelectorEl.addEventListener('change', function() {
        State.setCurrentFittingStrategy(this.value);
        localStorage.setItem(Config.STORAGE_KEY_FITTING_STRATEGY, State.currentFittingStrategy);
    });
    DOM.useOffcutsCheckboxEl.addEventListener('change', function() {
        if (this.checked) {
            OffcutManager.promptForOffcutSelection();
        } else {
            State.currentCalculationOffcuts = [];
        }
    });
    // ... (अन्य सभी इवेंट श्रोता)


    // प्रारंभिक अवस्था लोड करें
    const savedLang = localStorage.getItem(Config.STORAGE_KEY_LANGUAGE) || 'hi';
    const savedUnit = localStorage.getItem(Config.STORAGE_KEY_CURRENT_UNIT) || 'cm';
    State.setCurrentUnit(savedUnit);
    if(DOM.currentUnitSelectorEl) DOM.currentUnitSelectorEl.value = State.currentUnit;
    // ... (बाकी initializeApp लॉजिक, State और DOM मॉड्यूल का उपयोग करके) ...
    
    const savedGrainColor = localStorage.getItem(Config.STORAGE_KEY_GRAIN_COLOR);
    if (savedGrainColor) { State.setCurrentGrainColor(savedGrainColor); }
    if (DOM.modalGrainColorEl) DOM.modalGrainColorEl.value = State.currentGrainColor;
    // ... (और भी initializeApp लॉजिक)

    setLanguage(savedLang); // भाषा अंत में सेट करें ताकि सभी टेक्स्ट सही हों
    PieceManager.clearPieceInputs(); 
    // ...
    console.log("App initialized (Modular).");
}

// वैश्विक नेमस्पेस में आवश्यक फ़ंक्शंस असाइन करें ताकि HTML उन्हें कॉल कर सके
// (यह आदर्श नहीं है, बेहतर होगा कि इवेंट श्रोता main.js में ही जोड़े जाएं)
window.toggleLanguage = UI.toggleLanguage;
window.showUnitSettingsModal = UI.showUnitSettingsModal;
window.closeUnitSettingsModal = UI.closeUnitSettingsModal;
window.applyUnitChange = UI.applyUnitChange; // UI या State मॉड्यूल में ले जाएं
// ... (आपके सभी वैश्विक फ़ंक्शंस)
window.addPiece = PieceManager.addPiece;
window.removePiece = PieceManager.removePiece; // PieceManager में ले जाएं और वहाँ से export करें
window.calculateAndDrawLayout = Layout.calculateAndDrawLayout; // डिफ़ॉल्ट रणनीति के साथ
window.calculateWithSelectedStrategy = Layout.calculateWithSelectedStrategy;
window.resetAll = State.resetAll; // State मॉड्यूल में ले जाएं
window.prepareAndPrint = ExportPrint.prepareAndPrint; // ExportPrint मॉड्यूल में ले जाएं
// ... और इसी तरह सभी वैश्विक फंक्शन्स के लिए।

window.onload = initializeApp;
