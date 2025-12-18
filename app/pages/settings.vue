<template>
  <div class="settings-page">
    <AnimatedBackground />
    
    <div class="settings-container">
      <div class="glass-panel settings-card">
        <div class="settings-header">
          <h1>Settings</h1>
          <div class="header-actions">
             <button
              @click="logout"
              class="logout-btn"
              title="Logout"
            >
              <LogOut :size="20" />
            </button>
            <button @click="router.back()" class="close-btn" title="Close">
              <X :size="24" />
            </button>
          </div>
        </div>

        <div class="settings-scroll-area">
          <section class="settings-section">
            <h2>Interface</h2>

            <div class="setting-item">
              <div class="setting-label">
                <label>UI Scale</label>
                <span class="value">{{ settings.uiScale.toFixed(2) }}x</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.05"
                v-model.number="settings.uiScale"
              />
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <label>Header Size</label>
                <span class="value">{{ settings.headerSize.toFixed(2) }}rem</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                v-model.number="settings.headerSize"
              />
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <label>Text Size</label>
                <span class="value">{{ settings.textSize.toFixed(2) }}rem</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="2"
                step="0.05"
                v-model.number="settings.textSize"
              />
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <label>File Visibility</label>
                <span class="value">{{ fileVisibilityLabel }}</span>
              </div>
              <div class="font-picker">
                <Dropdown
                  :items="fileVisibilityItems"
                  :label="fileVisibilityLabel"
                  title="File Visibility"
                />
              </div>
              <p class="description">
                Control which files are shown in the file tree.
              </p>
            </div>
          </section>

          <section class="settings-section">
            <h2>Appearance</h2>

            <div class="setting-item">
              <div class="setting-label">
                <label>Accent Color</label>
                <span class="value">{{ settings.accentColor }}</span>
              </div>
              <input type="color" v-model="settings.accentColor" />
              <p class="description">
                Theme accent color for highlights, buttons and links.
              </p>
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <label>Sidebar Width</label>
                <span class="value">{{ settings.sidebarWidth }}px</span>
              </div>
              <input
                type="range"
                min="200"
                max="400"
                step="10"
                v-model.number="settings.sidebarWidth"
              />
            </div>
          </section>

          <section class="settings-section">
            <h2>AI</h2>

            <div class="setting-item">
              <div class="setting-label">
                <label>Gemini API Key</label>
                <span class="value" v-if="settings.geminiApiKey">Set</span>
              </div>
              <UiTextInput
                class="setting-input"
                type="password"
                placeholder="Enter your Gemini API Key"
                v-model="settings.geminiApiKey"
              />
              <p class="description">
                Required for AI features. Key is stored locally.
              </p>
            </div>

            <div class="setting-item checkbox">
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.enableInlineSuggestions" />
                Enable Inline Suggestions
              </label>
            </div>

            <template v-if="settings.enableInlineSuggestions">
              <div class="setting-item checkbox">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="settings.enableInlineSuggestionsMobile"
                  />
                  Enable on Mobile
                </label>
              </div>

              <div class="setting-item">
                <div class="setting-label">
                  <label>Context Size (chars)</label>
                  <span class="value">{{
                    settings.inlineSuggestionContextSize
                  }}</span>
                </div>
                <UiTextInput
                  class="setting-input"
                  type="number"
                  min="100"
                  max="5000"
                  step="100"
                  v-model.number="settings.inlineSuggestionContextSize"
                />
              </div>

              <div class="setting-item">
                <div class="setting-label">
                  <label>Debounce Time (ms)</label>
                  <span class="value"
                    >{{ settings.inlineSuggestionDebounceTime }}ms</span
                  >
                </div>
                <UiTextInput
                  class="setting-input"
                  type="number"
                  min="200"
                  max="5000"
                  step="100"
                  v-model.number="settings.inlineSuggestionDebounceTime"
                />
              </div>

              <div class="setting-item">
                <div class="setting-label">
                  <label>Max Tokens</label>
                  <span class="value">{{ settings.inlineSuggestionMaxTokens }}</span>
                </div>
                <UiTextInput
                  class="setting-input"
                  type="number"
                  min="5"
                  max="100"
                  step="5"
                  v-model.number="settings.inlineSuggestionMaxTokens"
                />
              </div>
            </template>
          </section>

          <section class="settings-section">
            <h2>Editor</h2>

            <div class="setting-item">
              <div class="setting-label">
                <label>Font Size</label>
                <span class="value">{{ settings.editorFontSize }}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="32"
                step="1"
                v-model.number="settings.editorFontSize"
              />
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <label>Font Family</label>
              </div>
              <div class="font-picker">
                <Dropdown
                  :items="fontDropdownItems"
                  :label="selectedFontLabel"
                  :label-style="{ fontFamily: settings.editorFontFamily }"
                  title="Font Family"
                />
              </div>
              <p class="description">
                Choose from a curated collection of beautiful Google Fonts.
              </p>
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <label>Line Height</label>
                <span class="value">{{ settings.editorLineHeight }}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="2.5"
                step="0.1"
                v-model.number="settings.editorLineHeight"
              />
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <label>Code Font Size</label>
                <span class="value">{{ settings.editorCodeFontSize }}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="24"
                step="1"
                v-model.number="settings.editorCodeFontSize"
              />
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <label>Code Font Family</label>
              </div>
              <div class="font-picker">
                <Dropdown
                  :items="codeFontDropdownItems"
                  :label="selectedCodeFontLabel"
                  :label-style="{ fontFamily: settings.editorCodeFontFamily }"
                  title="Code Font Family"
                />
              </div>
            </div>

            <div class="setting-item checkbox">
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.editorShowLineNumbers" />
                Show Line Numbers
              </label>
            </div>

            <div class="setting-item checkbox">
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.editorWordWrap" />
                Word Wrap
              </label>
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <label>Background Color</label>
                <span class="value">{{ settings.editorBackgroundColor }}</span>
              </div>
              <input type="color" v-model="settings.editorBackgroundColor" />
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <label>Text Color</label>
                <span class="value">{{ settings.editorTextColor }}</span>
              </div>
              <input type="color" v-model="settings.editorTextColor" />
            </div>

            <div class="setting-item checkbox">
              <label class="checkbox-label">
                <input type="checkbox" v-model="settings.editorSpellcheck" />
                Spellcheck
              </label>
            </div>
          </section>

          <section class="settings-section">
            <h2>Daily Notes</h2>

            <div class="setting-item">
              <div class="setting-label">
                <label>Daily Note Folder</label>
                <span class="value">{{ settings.dailyNotePath }}</span>
              </div>
              <UiTextInput
                class="setting-input"
                placeholder="e.g. /Daily"
                v-model="settings.dailyNotePath"
              />
              <p class="description">
                Folder where daily notes will be created.
              </p>
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <label>Title Format</label>
                <span class="value">{{ settings.dailyNoteDateFormat }}</span>
              </div>
              <UiTextInput
                class="setting-input"
                placeholder="e.g. Daily YYYY-MM-DD"
                v-model="settings.dailyNoteDateFormat"
              />
              <p class="description">
                Format for the daily note title. Supported: YYYY, MM, DD.
              </p>
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <label>Template (Optional)</label>
              </div>
              <UiTextInput
                class="setting-input"
                placeholder="Path to template file (e.g. /Templates/Daily.md)"
                v-model="settings.dailyNoteTemplate"
              />
              <p class="description">
                Path to a markdown file to use as a template.
              </p>
            </div>
          </section>

          <section class="settings-section">
            <h2>Preview</h2>

            <div class="setting-item">
              <div class="setting-label">
                <label>Preview Font Size</label>
                <span class="value">{{ settings.previewFontSize }}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="32"
                step="1"
                v-model.number="settings.previewFontSize"
              />
            </div>
          </section>

           <section class="settings-section">
            <h2>Auto-Save</h2>

            <div class="setting-item">
              <div class="setting-label">
                <label>Auto-Save Interval</label>
                <span class="value">{{
                  settings.autoSaveInterval === 0
                    ? "Disabled"
                    : settings.autoSaveInterval + "s"
                }}</span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="5"
                v-model.number="settings.autoSaveInterval"
              />
              <p class="description">
                Automatically save changes after editing.
              </p>
            </div>
          </section>

          <section class="settings-section actions">
             <ShinyButton
              text="Revert Changes & Repull"
              gradient-start="var(--bg-dark-300)"
              gradient-end="var(--bg-dark-400)"
              @click="revertAll"
              style="margin-bottom: 1rem"
            >
              <template #icon>
                <RefreshCw :size="20" />
              </template>
            </ShinyButton>
            
            <ShinyButton
               text="Reset to Defaults"
               gradient-start="var(--bg-dark-300)"
               gradient-end="var(--bg-dark-400)"
               @click="reset"
            >
               <template #icon>
                <RotateCcw :size="20" />
              </template>
            </ShinyButton>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Eye, FileText, Files, LogOut, RefreshCw, RotateCcw, X } from "lucide-vue-next";
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import AnimatedBackground from "~/components/ui/AnimatedBackground.vue";
import Dropdown, { type DropdownItem } from "~/components/ui/Dropdown.vue";
import ShinyButton from "~/components/ui/ShinyButton.vue";
import { useGitStore } from "~/stores/git";
import { useSettingsStore } from "~/stores/settings";
import { useUIStore } from "~/stores/ui";

const settings = useSettingsStore();
const githubStore = useGitStore();
const uiStore = useUIStore();
const router = useRouter();

const revertAll = async () => {
  const hasChanges = githubStore.hasUnsavedChanges;
  const title = hasChanges ? "Discard Changes & Repull?" : "Repull All Files?";
  const message = hasChanges 
    ? "Are you sure you want to discard ALL unsaved changes and repull files from the provider? This cannot be undone."
    : "This will refresh the file tree and reload all files from the provider. Continue?";
  
  const confirmText = hasChanges ? "Discard & Repull" : "Repull";

  if (
    await uiStore.openConfirmDialog(
      title,
      message,
      confirmText,
      "Cancel",
      hasChanges 
    )
  ) {
    await githubStore.revertAll();
  }
};

const logout = async () => {
  if (
    await uiStore.openConfirmDialog(
      "Logout",
      "Are you sure you want to logout? Any unsaved changes will be cleared.",
      "Logout",
      "Cancel",
      true
    )
  ) {
    githubStore.logout();
    router.push("/");
  }
};

const reset = () => {
  settings.resetSettings();
};

type FontOption = {
  group:
    | "Sans-Serif Fonts"
    | "Serif Fonts"
    | "Monospace Fonts"
    | "Display & Special Fonts";
  label: string;
  value: string;
};

const fontOptions: FontOption[] = [
  {
    group: "Sans-Serif Fonts",
    label: "Inter (Modern & Clean)",
    value: "'Inter', sans-serif",
  },
  {
    group: "Sans-Serif Fonts",
    label: "Poppins (Geometric & Friendly)",
    value: "'Poppins', sans-serif",
  },
  {
    group: "Sans-Serif Fonts",
    label: "Roboto (Classic & Versatile)",
    value: "'Roboto', sans-serif",
  },
  {
    group: "Sans-Serif Fonts",
    label: "Open Sans (Humanist & Readable)",
    value: "'Open Sans', sans-serif",
  },
  {
    group: "Sans-Serif Fonts",
    label: "Lato (Professional & Warm)",
    value: "'Lato', sans-serif",
  },
  {
    group: "Sans-Serif Fonts",
    label: "Montserrat (Bold & Urban)",
    value: "'Montserrat', sans-serif",
  },
  {
    group: "Sans-Serif Fonts",
    label: "Raleway (Elegant & Thin)",
    value: "'Raleway', sans-serif",
  },
  {
    group: "Sans-Serif Fonts",
    label: "Source Sans 3 (Adobe Classic)",
    value: "'Source Sans 3', sans-serif",
  },
  {
    group: "Sans-Serif Fonts",
    label: "Nunito (Rounded & Soft)",
    value: "'Nunito', sans-serif",
  },

  {
    group: "Serif Fonts",
    label: "Merriweather (Readable & Traditional)",
    value: "'Merriweather', serif",
  },
  {
    group: "Serif Fonts",
    label: "Playfair Display (High Contrast & Elegant)",
    value: "'Playfair Display', serif",
  },
  {
    group: "Serif Fonts",
    label: "Lora (Calligraphic & Beautiful)",
    value: "'Lora', serif",
  },
  {
    group: "Serif Fonts",
    label: "PT Serif (Classic & Professional)",
    value: "'PT Serif', serif",
  },
  {
    group: "Serif Fonts",
    label: "Crimson Text (Book-like & Refined)",
    value: "'Crimson Text', serif",
  },

  {
    group: "Monospace Fonts",
    label: "JetBrains Mono (Code Ligatures)",
    value: "'JetBrains Mono', monospace",
  },
  {
    group: "Monospace Fonts",
    label: "IBM Plex Mono (Grotesque & Technical)",
    value: "'IBM Plex Mono', monospace",
  },
  {
    group: "Monospace Fonts",
    label: "Fira Code (Programming Ligatures)",
    value: "'Fira Code', monospace",
  },
  {
    group: "Monospace Fonts",
    label: "Roboto Mono (Clean & Consistent)",
    value: "'Roboto Mono', monospace",
  },
  {
    group: "Monospace Fonts",
    label: "Source Code Pro (Adobe Code)",
    value: "'Source Code Pro', monospace",
  },
  {
    group: "Monospace Fonts",
    label: "Space Mono (Retro & Geometric)",
    value: "'Space Mono', monospace",
  },
  {
    group: "Monospace Fonts",
    label: "Ubuntu Mono (Distinctive & Clear)",
    value: "'Ubuntu Mono', monospace",
  },

  {
    group: "Display & Special Fonts",
    label: "Orbitron (Futuristic & Tech)",
    value: "'Orbitron', sans-serif",
  },
  {
    group: "Display & Special Fonts",
    label: "Righteous (Bold & Playful)",
    value: "'Righteous', sans-serif",
  },
  {
    group: "Display & Special Fonts",
    label: "Bebas Neue (All Caps & Strong)",
    value: "'Bebas Neue', sans-serif",
  },
  {
    group: "Display & Special Fonts",
    label: "Pacifico (Brush Script & Casual)",
    value: "'Pacifico', cursive",
  },
  {
    group: "Display & Special Fonts",
    label: "Caveat (Handwritten & Personal)",
    value: "'Caveat', cursive",
  },
  {
    group: "Display & Special Fonts",
    label: "Dancing Script (Flowing & Elegant)",
    value: "'Dancing Script', cursive",
  },
];

const selectedFontLabel = computed(() => {
  const match = fontOptions.find((f) => f.value === settings.editorFontFamily);
  return match?.label || "Select font";
});

const fontDropdownItems = computed<DropdownItem[]>(() => {
  const groups: FontOption["group"][] = [
    "Sans-Serif Fonts",
    "Serif Fonts",
    "Monospace Fonts",
    "Display & Special Fonts",
  ];

  const items: DropdownItem[] = [];
  for (const group of groups) {
    items.push({
      label: group,
      disabled: true,
      action: () => {},
    });

    for (const font of fontOptions.filter((f) => f.group === group)) {
      items.push({
        label: font.label,
        action: () => {
          settings.editorFontFamily = font.value;
        },
        labelStyle: {
          fontFamily: font.value,
        },
      });
    }
  }
  return items;
});

const selectedCodeFontLabel = computed(() => {
  const match = fontOptions.find(
    (f) => f.value === settings.editorCodeFontFamily
  );
  return match?.label || "Select font";
});

const codeFontDropdownItems = computed<DropdownItem[]>(() => {
  
  
  
  
  
  
  
  
  const groups: FontOption["group"][] = [
    "Monospace Fonts",
    "Sans-Serif Fonts", 
    "Serif Fonts",
    "Display & Special Fonts",
  ];

  const items: DropdownItem[] = [];
  for (const group of groups) {
    
    
    
    const groupFonts = fontOptions.filter((f) => f.group === group);
    if (groupFonts.length === 0) continue;

    items.push({
      label: group,
      disabled: true,
      action: () => {},
    });

    for (const font of groupFonts) {
      items.push({
        label: font.label,
        action: () => {
          settings.editorCodeFontFamily = font.value;
        },
        labelStyle: {
          fontFamily: font.value,
        },
      });
    }
  }
  return items;
});

onMounted(() => {
  // Enforce the 3-level logic:
  // If dotfiles are shown but "all files" is not, this is an ambiguous state for our new logic.
  // We'll default to "Content Related Only" as requested, or maybe "All Files + Dotfiles" if appropriate?
  // The user said "it should default to 'content related only'".
  // So if we have a mismatch, reset to F, F.
  if (settings.showDotfiles && !settings.showAllFiles) {
    settings.showDotfiles = false;
    settings.showAllFiles = false;
  }
});

const fileVisibilityLabel = computed(() => {
  if (settings.showDotfiles && settings.showAllFiles) return "All Files + Dotfiles";
  if (settings.showAllFiles) return "All Files";
  return "Content Related Only";
});

const fileVisibilityItems = computed<DropdownItem[]>(() => {
  return [
    {
      label: "Content Related Only",
      icon: FileText,
      action: () => {
        settings.showDotfiles = false;
        settings.showAllFiles = false;
      },
    },
    {
      label: "All Files",
      icon: Files,
      action: () => {
        settings.showDotfiles = false;
        settings.showAllFiles = true;
      },
    },
    {
      label: "All Files + Dotfiles",
      icon: Eye,
      action: () => {
        settings.showDotfiles = true;
        settings.showAllFiles = true;
      },
    },
  ];
});
</script>

<style scoped lang="scss">
.settings-page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-dark-100);
  z-index: 100;
  overflow: hidden;  
}

.settings-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;  
  padding: 2rem;
  overflow-y: auto; 
}

 
@media (min-height: 800px) {
  .settings-container {
     align-items: center;
  }
}
@media (max-height: 800px) {
    .settings-container {
        align-items: flex-start;
        padding-top: 2rem;
    }
}


.settings-card {
  width: 100%;
  max-width: 700px;
  max-height: 90vh;  
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  background: hsla(240, 10%, 6%, 0.7);  
  overflow: hidden;
}

.settings-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  flex-shrink: 0;

  h1 {
    font-size: 1.5rem;
    color: var(--text-primary);
    margin: 0;
  }
  
  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .close-btn, .logout-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--bg-dark-300);
      color: var(--text-primary);
    }
  }
  
  .logout-btn:hover {
    color: #ff4d4f;  
    background: rgba(255, 77, 79, 0.1);
  }
}

.settings-scroll-area {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;  
  
   
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--bg-dark-300);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: var(--bg-dark-400); 
  }
}

.settings-section {
  margin-bottom: 3rem;

  h2 {
    font-size: 1.1rem;
    color: var(--color-primary);
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-subtle);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}

.setting-item {
  margin-bottom: 1.5rem;
  
   
  input[type="range"] {
    margin-top: 0.5rem;
  }

  .setting-label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    align-items: center;

    label {
      color: var(--text-primary);
      font-weight: 500;
      font-size: 0.95rem;
    }

    .value {
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 0.85rem;
      background: var(--bg-dark-300);
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
    }
  }

  .description {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-top: 0.5rem;
    line-height: 1.4;
  }

  input[type="color"] {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 100%;
    height: 40px;
    background-color: transparent;
    border: none;
    cursor: pointer;
    padding: 0;

    &::-webkit-color-swatch {
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      transition: border-color 0.2s;
    }

    &::-moz-color-swatch {
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      transition: border-color 0.2s;
    }

    &:hover::-webkit-color-swatch {
      border-color: var(--text-muted);
    }

    &:hover::-moz-color-swatch {
      border-color: var(--text-muted);
    }
  }
}

.font-picker {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.font-picker :deep(.trigger-btn) {
  width: 100%;
  max-width: 100%;
  justify-content: space-between;
  background: var(--bg-dark-200);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  color: var(--text-primary);
  transition: all 0.2s;
  overflow: hidden;
  
  &:hover {
    border-color: var(--color-primary);
    background: var(--bg-dark-300);
  }
}

.setting-input {
  margin-top: 0.25rem;
}

.setting-item.checkbox {
  display: flex;
  align-items: center;
  background: var(--bg-dark-200);
  padding: 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--text-muted);
    background: var(--bg-dark-300);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    color: var(--text-primary);
    font-weight: 500;
    width: 100%;

    input[type="checkbox"] {
      width: 20px;
      height: 20px;
      accent-color: var(--color-primary);
      cursor: pointer;
    }
  }
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 2rem;
  border-top: 1px solid var(--border-subtle);
  padding-top: 2rem;
}
</style>
