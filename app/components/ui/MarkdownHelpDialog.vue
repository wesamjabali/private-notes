<template>
  <div v-if="isOpen" class="help-dialog-overlay" @click.self="onClose">
    <div class="help-dialog">
      <div class="help-header">
        <h3 class="help-title">Markdown Guide</h3>
        <button class="btn-close" @click="onClose">
            <X :size="20" />
        </button>
      </div>
      <div class="help-content">
        <div class="help-section">
            <h4>Basic Formatting</h4>
            <table>
                <tbody>
                <tr>
                    <td>**Bold**</td>
                    <td><strong>Bold</strong></td>
                </tr>
                <tr>
                    <td>*Italic*</td>
                    <td><em>Italic</em></td>
                </tr>
                 <tr>
                    <td>~~Strikethrough~~</td>
                    <td><del>Strikethrough</del></td>
                </tr>
                <tr>
                    <td>`Code`</td>
                    <td><code>Code</code></td>
                </tr>
                </tbody>
            </table>
        </div>

        <div class="help-section">
            <h4>Headings</h4>
             <table>
                <tbody>
                <tr>
                    <td># H1</td>
                    <td><h1 style="margin:0; font-size: 1.5em;">H1</h1></td>
                </tr>
                <tr>
                    <td>## H2</td>
                    <td><h2 style="margin:0; font-size: 1.3em;">H2</h2></td>
                </tr>
                <tr>
                    <td>### H3</td>
                    <td><h3 style="margin:0; font-size: 1.1em;">H3</h3></td>
                </tr>
                </tbody>
            </table>
        </div>

        <div class="help-section">
            <h4>Lists</h4>
             <table>
                <tbody>
                <tr>
                    <td>- Item</td>
                    <td><ul><li>Item</li></ul></td>
                </tr>
                <tr>
                    <td>1. Item</td>
                    <td><ol><li>Item</li></ol></td>
                </tr>
                <tr>
                    <td>- [x] Task</td>
                    <td><input type="checkbox" checked onclick="return false;"> Task</td>
                </tr>
                </tbody>
            </table>
        </div>

        <div class="help-section">
            <h4>Links & Images</h4>
            <div class="code-example">[Link Title](url)</div>
            <div class="code-example">![Image Alt](url)</div>
            <div class="code-example">[[Internal Link]]</div>
        </div>

        <div class="help-section">
            <h4>Blockquotes</h4>
            <div class="code-example">> This is a quote.</div>
        </div>

        <div class="help-section">
            <h4>Code Blocks</h4>
            <div class="code-example">
```javascript<br>
console.log('Code Block');<br>
```
            </div>
        </div>

        <div class="help-section">
            <h4>Tables</h4>
            <div class="code-example">
| Header 1 | Header 2 |<br>
| :--- | :--- |<br>
| Cell 1 | Cell 2 |
            </div>
        </div>
        
         <div class="help-section">
            <h4>Callouts</h4>
            <div class="code-example">
> [!NOTE]<br>
> This is a note callout.
            </div>
            <div class="note">Other types: TIP, IMPORTANT, WARNING, CAUTION</div>
        </div>

        <div class="help-section">
            <h4>Mermaid Diagrams</h4>
            <div class="code-example">
```mermaid<br>
graph TD;<br>
    A-->B;<br>
```
            </div>
        </div>
        
         <div class="help-section">
            <h4>Math / LaTeX</h4>
            <div class="code-example">$ E = mc^2 $</div>
        </div>

        <div class="help-section">
            <h4>Footnotes</h4>
            <div class="code-example">Text[^1]</div>
            <div class="code-example">[^1]: Footnote text.</div>
        </div>

         <div class="help-section">
            <h4>Definition List</h4>
            <div class="code-example">
Term<br>
: Definition
            </div>
        </div>

      </div>
      <div class="help-footer">
        <button class="btn-primary" @click="onClose">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from "lucide-vue-next";
import { onMounted, onUnmounted } from "vue";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const onClose = () => emit("close");

const handleKeydown = (e: KeyboardEvent) => {
  if (props.isOpen && e.key === "Escape") {
    onClose();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped lang="scss">
.help-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.help-dialog {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 600px;
  max-height: 85vh;  
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
}

.help-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-subtle);
}

.help-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-close {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: var(--radius-sm);
    display: flex;
    &:hover {
        background: var(--bg-dark-300);
        color: var(--text-primary);
    }
}

.help-content {
  padding: 1.5rem;
  overflow-y: auto;
  color: var(--text-secondary);
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.help-section {
    h4 {
        margin: 0 0 0.5rem 0;
        color: var(--text-primary);
        font-size: 1rem;
        border-bottom: 1px solid var(--border-subtle);
        padding-bottom: 0.25rem;
        margin-bottom: 0.75rem;
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
        
        td {
            padding: 0.25rem 0.5rem;
            border-bottom: 1px solid var(--border-subtle);
            &:last-child {
                text-align: right; 
                width: 50%;
            }
             &:first-child {
                font-family: monospace;
                color: var(--text-primary);
            }
        }
        tr:last-child td {
            border-bottom: none;
        }
        
        ul, ol {
            margin: 0;
            padding-left: 1.2rem;
        }
    }
}

.code-example {
    background: var(--bg-dark-300);
    padding: 0.75rem;
    border-radius: var(--radius-sm);
    font-family: monospace;
    font-size: 0.9em;
    white-space: pre-wrap;
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
}

.note {
    font-size: 0.85em;
    color: var(--text-secondary);
    margin-top: 0.25rem;
    font-style: italic;
}

.help-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    justify-content: flex-end;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: var(--color-primary-light);
  }
}
</style>
