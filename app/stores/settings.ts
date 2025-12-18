import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";

export interface AppSettings {
  uiScale: number;
  headerSize: number;
  textSize: number;
  editorFontSize: number;
  editorBackgroundColor: string;
  editorTextColor: string;
  accentColor: string;
  geminiApiKey: string;
  editorFontFamily: string;
  editorLineHeight: number;
  editorShowLineNumbers: boolean;
  editorWordWrap: boolean;
  editorSpellcheck: boolean;
  enableInlineSuggestions: boolean;
  enableInlineSuggestionsMobile: boolean;
  inlineSuggestionContextSize: number;
  inlineSuggestionDebounceTime: number;
  inlineSuggestionMaxTokens: number;
  showDotfiles: boolean;
  showAllFiles: boolean;
  autoSaveInterval: number; 
  previewFontSize: number;
  editorCodeFontSize: number;
  editorCodeFontFamily: string;
  sidebarWidth: number; 
  dailyNotePath: string;
  dailyNoteTemplate: string;
  dailyNoteDateFormat: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  uiScale: 1,
  headerSize: 1.25,
  textSize: 1,
  editorFontSize: 16,
  editorBackgroundColor: "#1e1e1e", 
  editorTextColor: "#dcddde", 
  accentColor: "#a882ff", 
  geminiApiKey: "",
  editorFontFamily: "'Inter', sans-serif",
  editorLineHeight: 1.5,
  editorShowLineNumbers: false,
  editorWordWrap: true,
  editorSpellcheck: false,
  enableInlineSuggestions: false,
  enableInlineSuggestionsMobile: false,
  inlineSuggestionContextSize: 500,
  inlineSuggestionDebounceTime: 1000,
  inlineSuggestionMaxTokens: 20,
  showDotfiles: false,
  showAllFiles: false,
  autoSaveInterval: 0, 
  previewFontSize: 16,
  editorCodeFontSize: 14,
  editorCodeFontFamily: "'JetBrains Mono', monospace",
  sidebarWidth: 280,
  dailyNotePath: "/Daily",
  dailyNoteTemplate: "",
  dailyNoteDateFormat: "Daily YYYY-MM-DD",
};

export const useSettingsStore = defineStore("settings", () => {
  
  
  const uiScale = useStorage("settings_uiScale", DEFAULT_SETTINGS.uiScale);
  const headerSize = useStorage(
    "settings_headerSize",
    DEFAULT_SETTINGS.headerSize
  );
  const textSize = useStorage("settings_textSize", DEFAULT_SETTINGS.textSize);
  const editorFontSize = useStorage(
    "settings_editorFontSize",
    DEFAULT_SETTINGS.editorFontSize
  );
  const editorBackgroundColor = useStorage(
    "settings_editorBackgroundColor",
    DEFAULT_SETTINGS.editorBackgroundColor
  );
  const editorTextColor = useStorage(
    "settings_editorTextColor",
    DEFAULT_SETTINGS.editorTextColor
  );
  const accentColor = useStorage(
    "settings_accentColor",
    DEFAULT_SETTINGS.accentColor
  );
  const geminiApiKey = useStorage(
    "settings_geminiApiKey",
    DEFAULT_SETTINGS.geminiApiKey
  );
  const editorFontFamily = useStorage(
    "settings_editorFontFamily",
    DEFAULT_SETTINGS.editorFontFamily
  );
  const editorLineHeight = useStorage(
    "settings_editorLineHeight",
    DEFAULT_SETTINGS.editorLineHeight
  );
  const editorShowLineNumbers = useStorage(
    "settings_editorShowLineNumbers",
    DEFAULT_SETTINGS.editorShowLineNumbers
  );
  const editorWordWrap = useStorage(
    "settings_editorWordWrap",
    DEFAULT_SETTINGS.editorWordWrap
  );
  const editorSpellcheck = useStorage(
    "settings_editorSpellcheck",
    DEFAULT_SETTINGS.editorSpellcheck
  );
  const enableInlineSuggestions = useStorage(
    "settings_enableInlineSuggestions",
    DEFAULT_SETTINGS.enableInlineSuggestions
  );
  const enableInlineSuggestionsMobile = useStorage(
    "settings_enableInlineSuggestionsMobile",
    DEFAULT_SETTINGS.enableInlineSuggestionsMobile
  );
  const inlineSuggestionContextSize = useStorage(
    "settings_inlineSuggestionContextSize",
    DEFAULT_SETTINGS.inlineSuggestionContextSize
  );
  const inlineSuggestionDebounceTime = useStorage(
    "settings_inlineSuggestionDebounceTime",
    DEFAULT_SETTINGS.inlineSuggestionDebounceTime
  );
  const inlineSuggestionMaxTokens = useStorage(
    "settings_inlineSuggestionMaxTokens",
    DEFAULT_SETTINGS.inlineSuggestionMaxTokens
  );
  const showDotfiles = useStorage(
    "settings_showDotfiles",
    DEFAULT_SETTINGS.showDotfiles
  );
  const showAllFiles = useStorage(
    "settings_showAllFiles",
    DEFAULT_SETTINGS.showAllFiles
  );
  const autoSaveInterval = useStorage(
    "settings_autoSaveInterval",
    DEFAULT_SETTINGS.autoSaveInterval
  );
  const previewFontSize = useStorage(
    "settings_previewFontSize",
    DEFAULT_SETTINGS.previewFontSize
  );
  const editorCodeFontSize = useStorage(
    "settings_editorCodeFontSize",
    DEFAULT_SETTINGS.editorCodeFontSize
  );
  const editorCodeFontFamily = useStorage(
    "settings_editorCodeFontFamily",
    DEFAULT_SETTINGS.editorCodeFontFamily
  );
  const sidebarWidth = useStorage(
    "settings_sidebarWidth",
    DEFAULT_SETTINGS.sidebarWidth
  );
  const dailyNotePath = useStorage(
    "settings_dailyNotePath",
    DEFAULT_SETTINGS.dailyNotePath
  );
  const dailyNoteTemplate = useStorage(
    "settings_dailyNoteTemplate",
    DEFAULT_SETTINGS.dailyNoteTemplate
  );
  const dailyNoteDateFormat = useStorage(
    "settings_dailyNoteDateFormat",
    DEFAULT_SETTINGS.dailyNoteDateFormat
  );

  
  
  
  
  
  const loadSettings = async () => {
    
  };

  const saveSettings = async () => {
    
  };

  const resetSettings = () => {
    uiScale.value = DEFAULT_SETTINGS.uiScale;
    headerSize.value = DEFAULT_SETTINGS.headerSize;
    textSize.value = DEFAULT_SETTINGS.textSize;
    editorFontSize.value = DEFAULT_SETTINGS.editorFontSize;
    editorBackgroundColor.value = DEFAULT_SETTINGS.editorBackgroundColor;
    editorTextColor.value = DEFAULT_SETTINGS.editorTextColor;
    accentColor.value = DEFAULT_SETTINGS.accentColor;
    geminiApiKey.value = DEFAULT_SETTINGS.geminiApiKey;
    editorFontFamily.value = DEFAULT_SETTINGS.editorFontFamily;
    editorLineHeight.value = DEFAULT_SETTINGS.editorLineHeight;
    editorShowLineNumbers.value = DEFAULT_SETTINGS.editorShowLineNumbers;
    editorWordWrap.value = DEFAULT_SETTINGS.editorWordWrap;
    editorSpellcheck.value = DEFAULT_SETTINGS.editorSpellcheck;
    enableInlineSuggestions.value = DEFAULT_SETTINGS.enableInlineSuggestions;
    enableInlineSuggestionsMobile.value =
      DEFAULT_SETTINGS.enableInlineSuggestionsMobile;
    inlineSuggestionContextSize.value =
      DEFAULT_SETTINGS.inlineSuggestionContextSize;
    inlineSuggestionDebounceTime.value =
      DEFAULT_SETTINGS.inlineSuggestionDebounceTime;
    inlineSuggestionMaxTokens.value =
      DEFAULT_SETTINGS.inlineSuggestionMaxTokens;
    showDotfiles.value = DEFAULT_SETTINGS.showDotfiles;
    showAllFiles.value = DEFAULT_SETTINGS.showAllFiles;
    autoSaveInterval.value = DEFAULT_SETTINGS.autoSaveInterval;
    previewFontSize.value = DEFAULT_SETTINGS.previewFontSize;
    editorCodeFontSize.value = DEFAULT_SETTINGS.editorCodeFontSize;
    editorCodeFontFamily.value = DEFAULT_SETTINGS.editorCodeFontFamily;
    sidebarWidth.value = DEFAULT_SETTINGS.sidebarWidth;
    dailyNotePath.value = DEFAULT_SETTINGS.dailyNotePath;
    dailyNoteTemplate.value = DEFAULT_SETTINGS.dailyNoteTemplate;
    dailyNoteDateFormat.value = DEFAULT_SETTINGS.dailyNoteDateFormat;
  };

  return {
    uiScale,
    headerSize,
    textSize,
    editorFontSize,
    editorBackgroundColor,
    editorTextColor,
    accentColor,
    geminiApiKey,
    editorFontFamily,
    editorLineHeight,
    editorShowLineNumbers,
    editorWordWrap,
    editorSpellcheck,
    enableInlineSuggestions,
    enableInlineSuggestionsMobile,
    inlineSuggestionContextSize,
    inlineSuggestionDebounceTime,
    inlineSuggestionMaxTokens,
    showDotfiles,
    showAllFiles,
    autoSaveInterval,
    previewFontSize,
    editorCodeFontSize,
    editorCodeFontFamily,
    sidebarWidth,
    loadSettings,
    saveSettings,
    resetSettings,
    dailyNotePath,
    dailyNoteTemplate,
    dailyNoteDateFormat,
  };
});
