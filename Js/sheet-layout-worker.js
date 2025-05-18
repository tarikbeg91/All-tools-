// js/main.js
import * as Config from './config.js';
import * as DOM from './dom-elements.js';
import * as State from './state.js';
import * as UIHandlers from './ui-handlers.js'; // UI इवेंट हैंडलर्स के लिए
import * as PieceManager from './piece-manager.js';
import * as Layout from './layout-calculator.js';
import * as Display from './display-utils.js';
import * as OffcutManager from './offcut-manager.js';
import * as ExportPrint from './export-print.js';
// utils.js से भी इम्पोर्ट करें यदि आवश्यक हो
import { updateUnitDisplaysDOM } from './dom-elements.js'; // यदि यह dom-elements.js में है

// getLangString को वैश्विक रूप से उपलब्ध कराएं (या इसे प्रत्येक मॉड्यूल में इम्पोर्ट करें)
window.getLangString = function(key, replacements = {}) { 
    let str = (Config.langStrings[State.currentLanguage] && Config.langStrings[State.currentLanguage][key]) || `[[${key}]]`; 
    for (const placeholder in replacements) { str = str.replace(`{${placeholder}}`, replacements[placeholder]); } 
    return str; 
}

export function setLanguage(lang) { // इसे export करें ताकि UIHandlers इसे कॉल कर सके
    State.setCurrentLanguage(lang); 
    if(document.documentElement) document.documentElement.lang = lang;
    const elements = document.querySelectorAll('[data-lang-key]');
    elements.forEach(el => {
        const key = el.getAttribute('data-lang-key');
        const placeholderKey = el.getAttribute('data-lang-placeholder');
        if (Config.langStrings[State.currentLanguage] && Config.langStrings[State.currentLanguage][key]) {
            if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'number') && placeholderKey && Config.langStrings[State.currentLanguage][placeholderKey] ) {
                el.placeholder = getLangString(placeholderKey) + (placeholderKey === "pieceDefaultName" ? (State.pieceIdCounter + 1) : "");
            } else if (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.placeholder !== undefined && !placeholderKey) {
                 if (el.id !== 'partName' && el.id !== 'partWidth' && el.id !== 'partLength' && el.id !== 'partQuantity') { 
                    el.placeholder = getLangString(key);
                }
            } else if (el.tagName === 'OPTION') { 
                if (Config.langStrings[State.currentLanguage][key]) el.textContent = getLangString(key);
            }
             else {
                el.textContent = getLangString(key);
            }
        }
    });
    updateUnitDisplaysDOM(State.currentUnit); 
    PieceManager.renderPiecesTable(); 
    if (DOM.historyModalEl && DOM.historyModalEl.style.display === 'flex') UIHandlers.showHistoryModal(); 
    if (DOM.projectManagementModalEl && DOM.projectManagementModalEl.style.display === 'flex') UIHandlers.renderProjectsList(); 
    if (DOM.offcutsLibraryModalEl && DOM.offcutsLibraryModalEl.style.display === 'flex') OffcutManager.renderOffcutsList();

    if (State.lastCalculatedSheetsData && State.lastCalculatedSheetsData.length > 0) {
        Display.displayLayoutOnCanvas(State.lastCalculatedSheetsData);
    } else if ((!State.pieces || State.pieces.length === 0) && DOM.resultsSummaryEl) {
         DOM.resultsSummaryEl.textContent = getLangString("totalSheetsDefault");
         if(DOM.sheetsContainerEl) DOM.sheetsContainerEl.innerHTML = '';
         if(DOM.wastageSectionEl) DOM.wastageSectionEl.style.display = 'none';
    }
    localStorage.setItem(Config.STORAGE_KEY_LANGUAGE, lang);
}


function initializeApp() {
    DOM.cacheDOMElements(); // सबसे पहले DOM एलिमेंट्स कैश करें
    
    State.loadSavedOffcuts(); 
    State.loadOffcutSettings(); 

    // UI इवेंट श्रोता यहाँ सेट करें
    DOM.langToggleBtn.addEventListener('click', UIHandlers.toggleLanguage);
    DOM.manageProjectsIconBtn.addEventListener('click', UIHandlers.showProjectManagementModal);
    DOM.showOffcutsLibraryIconBtn.addEventListener('click', OffcutManager.showOffcutsLibraryModal);
    DOM.unitSettingsIconBtn.addEventListener('click', UIHandlers.showUnitSettingsModal);
    DOM.printToPdfButtonBtn.addEventListener('click', ExportPrint.prepareAndPrint);
    DOM.sheetSettingsIconBtn.addEventListener('click', UIHandlers.showSheetSettingsModal);
    DOM.historyIconBtn.addEventListener('click', UIHandlers.showHistoryModal);
    DOM.jsonIconBtn.addEventListener('click', UIHandlers.toggleJsonMenu);

    DOM.document.getElementById('exportJsonLink').addEventListener('click', (e) => { e.preventDefault(); ExportPrint.exportDataAsJson(); UIHandlers.closeJsonMenu(); });
    DOM.document.getElementById('importJsonInputHidden').addEventListener('change', (e) => { ExportPrint.importDataFromJson(e); UIHandlers.closeJsonMenu(); });
    DOM.document.getElementById('clearSavedDataLink').addEventListener('click', (e) => { e.preventDefault(); State.clearSavedData(); UIHandlers.closeJsonMenu(); });
    
    DOM.document.getElementById('addPieceButton').addEventListener('click', PieceManager.addPiece);
    DOM.document.getElementById('calculateWithStrategyButton').addEventListener('click', Layout.calculateWithSelectedStrategy);
    DOM.document.getElementById('calculateLayoutDefaultButton').addEventListener('click', () => Layout.calculateAndDrawLayout()); // डिफ़ॉल्ट रणनीति के साथ
    DOM.document.getElementById('resetButton').addEventListener('click', State.resetAll);

    // Modals Close Buttons & Actions
    DOM.document.getElementById('closeUnitSettingsModalBtn').addEventListener('click', UIHandlers.closeUnitSettingsModal);
    DOM.document.getElementById('applyUnitChangeButton').addEventListener('click', UIHandlers.applyUnitChange);
    DOM.document.getElementById('closeSheetSettingsModalBtn').addEventListener('click', UIHandlers.closeSheetSettingsModal);
    DOM.document.getElementById('applySheetSettingsButton').addEventListener('click', UIHandlers.applySheetSettings);
    DOM.document.getElementById('closeHistoryModalBtn').addEventListener('click', UIHandlers.closeHistoryModal);
    DOM.document.getElementById('closeProjectManagementModalBtn').addEventListener('click', UIHandlers.closeProjectManagementModal);
    DOM.document.getElementById('saveCurrentProjectButton').addEventListener('click', State.saveCurrentProject);
    DOM.document.getElementById('closeOffcutsLibraryModalBtn').addEventListener('click', OffcutManager.closeOffcutsLibraryModal);
    DOM.document.getElementById('addManualOffcutButton').addEventListener('click', OffcutManager.addManualOffcut);

    // अन्य इवेंट श्रोता (जैसे modalGrainColorEl, fittingStrategySelectorEl, useOffcutsCheckboxEl)
    if(DOM.modalGrainColorEl) {
        DOM.modalGrainColorEl.addEventListener('change', function() {
            State.setCurrentGrainColor(this.value);
            localStorage.setItem(Config.STORAGE_KEY_GRAIN_COLOR, State.currentGrainColor);
            if (State.lastCalculatedSheetsData) {
                Display.displayLayoutOnCanvas(State.lastCalculatedSheetsData);
            }
        });
    }
    if(DOM.fittingStrategySelectorEl){
        DOM.fittingStrategySelectorEl.addEventListener('change', function() {
            State.setCurrentFittingStrategy(this.value);
            localStorage.setItem(Config.STORAGE_KEY_FITTING_STRATEGY, State.currentFittingStrategy);
        });
    }
    if(DOM.useOffcutsCheckboxEl){
        DOM.useOffcutsCheckboxEl.addEventListener('change', function() {
            if (this.checked) {
                OffcutManager.promptForOffcutSelection();
            } else {
                State.setCurrentCalculationOffcuts([]);
            }
        });
    }
    // शीट सेटिंग्स मोडल में ऑफकट इनपुट के लिए इवेंट श्रोता
    if(DOM.minOffcutWidthEl) DOM.minOffcutWidthEl.addEventListener('change', UIHandlers.saveOffcutSettingsFromModal);
    if(DOM.minOffcutLengthEl) DOM.minOffcutLengthEl.addEventListener('change', UIHandlers.saveOffcutSettingsFromModal);


    // JSON मेनू को बंद करने के लिए बॉडी पर क्लिक इवेंट
    document.body.addEventListener('click', function(event) {
        if (DOM.jsonMenuEl && DOM.jsonMenuEl.style.display === 'block' && !DOM.jsonMenuEl.contains(event.target) && event.target.id !== 'jsonIcon') {
            UIHandlers.closeJsonMenu();
        }
    });
    

    // प्रारंभिक अवस्था लोड करें
    const savedLang = localStorage.getItem(Config.STORAGE_KEY_LANGUAGE) || 'hi';
    const savedUnit = localStorage.getItem(Config.STORAGE_KEY_CURRENT_UNIT) || 'cm';
    State.setCurrentUnit(savedUnit);
    if(DOM.currentUnitSelectorEl) DOM.currentUnitSelectorEl.value = State.currentUnit;
    
    const settingsStr = localStorage.getItem(Config.STORAGE_KEY_SETTINGS); 
    if (settingsStr) {
        try {
            const settings = JSON.parse(settingsStr);
            if(DOM.modalSheetWidthEl) DOM.modalSheetWidthEl.value = convertFromCm(settings.sheetWidth, State.currentUnit) || "";
            if(DOM.modalSheetLengthEl) DOM.modalSheetLengthEl.value = convertFromCm(settings.sheetLength, State.currentUnit) || "";
            if(DOM.modalSheetHasGrainEl) DOM.modalSheetHasGrainEl.checked = typeof settings.hasGrain === 'boolean' ? settings.hasGrain : true;
            if(DOM.modalSheetNameEl) DOM.modalSheetNameEl.value = settings.sheetName || ""; 
            State.setCurrentGrainColor(settings.grainColor || 'rgba(0,0,0,0.08)');
            if (DOM.modalGrainColorEl) DOM.modalGrainColorEl.value = State.currentGrainColor;
            State.setCurrentFittingStrategy(settings.fittingStrategy || 'defaultScore');
            if (DOM.fittingStrategySelectorEl) DOM.fittingStrategySelectorEl.value = State.currentFittingStrategy;
            State.setOffcutSettings(settings.offcutSettings || { minWidth: 10, minLength: 45 });

        } catch (e) { console.error("Error parsing settings from localStorage:", e); }
    } 
    // सुनिश्चित करें कि ऑफकट सेटिंग्स UI में अपडेट हों
    if(DOM.minOffcutWidthEl) DOM.minOffcutWidthEl.value = convertFromCm(State.offcutSettings.minWidth, State.currentUnit);
    if(DOM.minOffcutLengthEl) DOM.minOffcutLengthEl.value = convertFromCm(State.offcutSettings.minLength, State.currentUnit);
    
    const piecesStr = localStorage.getItem(Config.STORAGE_KEY_PIECES);
    if (piecesStr) { try { State.setPieces(JSON.parse(piecesStr)); } catch (e) { State.setPieces([]);} }

    const idCounterStr = localStorage.getItem(Config.STORAGE_KEY_ID_COUNTER);
    State.setPieceIdCounter(idCounterStr ? parseInt(idCounterStr) : 0);
    if (State.pieces && State.pieces.length > 0 && State.pieceIdCounter === 0) { 
        const maxId = State.pieces.reduce((max, p) => (typeof p.id === 'number' && p.id > max ? p.id : max), -1);
        State.setPieceIdCounter(maxId >= 0 ? maxId + 1 : State.pieces.length);
    }

    State.loadHistoryFromStorage();
    State.loadCuttingListCheckboxStates();
    State.loadProjectsFromStorage();
    
    setLanguage(savedLang); // भाषा अंत में सेट करें
    PieceManager.clearPieceInputs(); 

    if(DOM.resultsSummaryEl) DOM.resultsSummaryEl.textContent = getLangString("totalSheetsDefault");
    if(DOM.wastageSectionEl) DOM.wastageSectionEl.style.display = 'none';
    
    console.log("App initialized (Modular).");
}

window.onload = initializeApp;
