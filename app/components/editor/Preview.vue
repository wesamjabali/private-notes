<script setup lang="ts">
import "katex/dist/katex.min.css";
import { ArrowLeft } from "lucide-vue-next";
import MarkdownIt from "markdown-it";
import MarkdownItDeflist from "markdown-it-deflist";
import MarkdownItFootnote from "markdown-it-footnote";
import MarkdownItKatex from "markdown-it-katex";
import MarkdownItMark from "markdown-it-mark";
import MarkdownItSub from "markdown-it-sub";
import MarkdownItSup from "markdown-it-sup";
import mermaid from "mermaid";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { parseMarkdownTable } from "~/codemirror/TableEditingExtension";
import markdownGitHubAlerts from "~/codemirror/markdown-github-alerts";
import { useGitStore, type FileNode } from "~/stores/git";

const props = defineProps<{
  content: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const router = useRouter();
const store = useGitStore();



const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true, 
}).use(MarkdownItSub)
  .use(MarkdownItSup)
  .use(MarkdownItFootnote)
  .use(MarkdownItDeflist)
  .use(MarkdownItMark)
  .use(MarkdownItKatex)
  .use(markdownGitHubAlerts);



md.inline.ruler.push('wiki_links', (state, silent) => {
    const max = state.posMax;
    const start = state.pos;

    
    if (state.src.charCodeAt(start) !== 0x5B  ) return false;
    if (start + 1 >= max || state.src.charCodeAt(start + 1) !== 0x5B) return false;

    
    const labelStart = start + 2;
    const labelEnd = state.src.indexOf(']]', labelStart);

    if (labelEnd < 0) return false;

    if (!silent) {
        const fullContent = state.src.slice(labelStart, labelEnd);
        
        const [target, alias] = fullContent.split('|');
        const displayText = (alias || target || "").trim();
        const linkTarget = (target || "").trim();

        const token = state.push('html_inline', '', 0);
        token.content = `<a href="#" class="internal-link" data-href="${linkTarget}">${displayText}</a>`;
    }

    state.pos = labelEnd + 2;
    return true;
});

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
});

const processLooseLinks = (text: string): string => {
    
    
    return text.replace(/\[(.*?)\]\((.*?)\)/g, (match, label, url) => {
        
        if (!url.includes(' ')) return match;
        
        
        const encodedUrl = url.trim().replace(/\s/g, '%20');
        return `[${label}](${encodedUrl})`;
    });
}

const processTables = (text: string): string => {
    
    
    
    const lines = text.split('\n');
    let inTable = false;
    let tableLines: string[] = [];
    let resultLines: string[] = [];
    
    
    const renderTableBlock = (blockLines: string[]) => {
       const rows = parseMarkdownTable(blockLines.join('\n'));
       if (rows.length < 2 || !rows[0]) return blockLines.join('\n'); 
       
       
       let html = '<table class="markdown-table">\n';
       
       
       html += '<thead>\n<tr>\n';
       rows[0].forEach(cell => {
          html += `<th>${md.renderInline(cell || "")}</th>\n`;
       });
       html += '</tr>\n</thead>\n';
       
       
       html += '<tbody>\n';
       for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;
          
          html += '<tr>\n';
          row.forEach(cell => {
             html += `<td>${md.renderInline(cell || "")}</td>\n`;
          });
          html += '</tr>\n';
       }
       html += '</tbody>\n</table>\n';
       return html;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined) continue;
        
        const isTableLine = line.trim().startsWith('|'); 
        
        if (isTableLine) {
           if (!inTable) { inTable = true; }
           tableLines.push(line);
        } else {
           if (inTable) {
               
               resultLines.push(renderTableBlock(tableLines));
               tableLines = [];
               inTable = false;
           }
           resultLines.push(line);
        }
    }
    
    if (inTable && tableLines.length > 0) {
        resultLines.push(renderTableBlock(tableLines));
    }
    
    return resultLines.join('\n');
}



const preprocessBlockquotes = (text: string): string => {
    const lines = text.split('\n');
    const result: string[] = [];
    let inBlockquote = false;
    let lastWasEmpty = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || '';
        const isQuoteLine = /^\s*>/.test(line);
        const isEmpty = line.trim() === '';
        
        if (isQuoteLine) {
            
            if (!inBlockquote && result.length > 0) {
                
                const lastLine = result[result.length - 1];
                if (lastLine && lastLine.trim() !== '') {
                    result.push('');
                }
            }
            inBlockquote = true;
            lastWasEmpty = false;
            result.push(line);
        } else if (isEmpty) {
            
            if (inBlockquote) {
                
                lastWasEmpty = true;
            }
            result.push(line);
        } else {
            
            if (inBlockquote) {
                
                
                if (!lastWasEmpty) {
                    result.push('');
                }
                inBlockquote = false;
            }
            lastWasEmpty = false;
            result.push(line);
        }
    }
    
    return result.join('\n');
}

const renderMarkdown = (text: string) => {
    let processed = processLooseLinks(text); 
    processed = processTables(processed);
    processed = preprocessBlockquotes(processed); 
    
    
    
    let html = md.render(processed);
    return html;
}



const parseFrontmatter = (text: string) => {
  const frontmatterRegex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*/;
  const match = text.match(frontmatterRegex);

  if (!match || !match[1]) {
    return { data: {}, content: text };
  }

  const yamlBlock = match[1];
  const content = text.replace(frontmatterRegex, "").trim();
  const data: Record<string, any> = {};

  const lines = yamlBlock.split("\n");
  for (const line of lines) {
    const parts = line.split(":");
    if (parts.length >= 2) {
      const key = (parts[0] || "").trim();
      let value: any = parts.slice(1).join(":").trim(); 
      
      if (value === "true") value = true;
      else if (value === "false") value = false;
      else if (value === "null" || value === "") value = null;
      else if (!isNaN(Number(value)) && value !== "") value = Number(value);
      
      data[key] = value;
    }
  }

  return { data, content };
};

const parsedContent = computed(() => {
  return parseFrontmatter(props.content || "");
});

const frontmatter = computed(() => parsedContent.value.data);
const bodyContent = computed(() => parsedContent.value.content);

const renderedContent = computed(() => {
  return renderMarkdown(bodyContent.value);
});


watch(renderedContent, () => {
    nextTick(refineDom);
});



const resolvedHeroImage = ref<string | null>(null);

watch(() => frontmatter.value.heroImage, async (newVal) => {
  if (!newVal) {
    resolvedHeroImage.value = null;
    return;
  }

  
  if (newVal.startsWith("http") || newVal.startsWith("data:")) {
    resolvedHeroImage.value = newVal;
    return;
  }

  
  const result = await store.resolveFileUrl(newVal);
  if (result) {
    resolvedHeroImage.value = result.url;
  } else {
    
    resolvedHeroImage.value = newVal;
  }
}, { immediate: true });



const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    emit("close");
  }
};

const previewContainer = ref<HTMLElement | null>(null);


const refineDom = () => {
    if (!previewContainer.value) return;
    
    
    
    
    const listItems = previewContainer.value.querySelectorAll('li');
    listItems.forEach(li => {
        const text = li.textContent || "";
        
        
        
        
        if (li.innerHTML.trim().startsWith('[ ] ')) {
            li.innerHTML = `<input type="checkbox" disabled class="task-checkbox"> ${li.innerHTML.trim().substring(4)}`;
            li.classList.add('task-list-item');
        } else if (li.innerHTML.trim().startsWith('[x] ')) {
             li.innerHTML = `<input type="checkbox" checked disabled class="task-checkbox"> <span class="task-completed">${li.innerHTML.trim().substring(4)}</span>`;
             li.classList.add('task-list-item');
        }
    });

    
    
    
    
    const links = previewContainer.value.querySelectorAll('a');
    links.forEach(a => {
        const href = a.getAttribute('href');
        const dataHref = a.getAttribute('data-href');
        
        
        const targetPath = dataHref || href;

        if (!targetPath) return;

        
        const isExternal = targetPath.match(/^[a-zA-Z]+:\/\//) || targetPath.startsWith('mailto:');

        if (isExternal) {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
            a.classList.add('external-link');
        } else if (!targetPath.startsWith('#') && !a.classList.contains('footnote-ref') && !a.classList.contains('footnote-backref')) {
            
            a.classList.add('internal-link'); 
            a.removeAttribute('target'); 
            
            a.addEventListener('click', (e) => {
                e.preventDefault();
                
                
                const findNode = (path: string, nodes: FileNode[]): FileNode | null => {
                    for (const node of nodes) {
                        if (node.path === path) return node;
                        if (node.children) {
                            const found = findNode(path, node.children);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                
                const node = findNode(targetPath, store.fileTree);
                
                if (node && store.currentRepo) {
                     const repoFullName = store.currentRepo.full_name;
                     router.push(`/repo/${repoFullName}/${node.path}`);
                     emit('close'); 
                } else if (store.currentRepo) {
                    console.warn('Node not found for path:', targetPath);
                }
            })
        }
    })

    
    const mermaidBlocks = previewContainer.value.querySelectorAll('pre > code.language-mermaid');
    const mermaidNodes: HTMLElement[] = [];
    
    mermaidBlocks.forEach(codeBlock => {
        const pre = codeBlock.parentElement;
        if (pre) {
             const code = codeBlock.textContent || "";
             const div = document.createElement('div');
             div.className = 'mermaid';
             div.textContent = code;
             div.style.textAlign = 'center';
             
             pre.replaceWith(div);
             mermaidNodes.push(div);
        }
    });
    
    if (mermaidNodes.length > 0) {
        mermaid.run({ nodes: mermaidNodes }).catch(err => {
            console.error("Mermaid error in preview:", err);
        });
    }
}



onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
  document.body.style.overflow = "hidden"; 
  setTimeout(refineDom, 50); 
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeydown);
  document.body.style.overflow = ""; 
});
</script>

<template>
  <div class="preview-overlay">
    <div class="preview-header">
      <button class="btn-back" @click="emit('close')">
        <ArrowLeft :size="18" class="icon" />
        <span class="back-text">Back to Editor</span>
      </button>

      <div class="spacer"></div>
    </div>
    
    <div class="preview-scroller">
      
      <div v-if="frontmatter.heroImage" class="hero-section">
        <img :src="resolvedHeroImage || frontmatter.heroImage" alt="Hero Image" class="hero-image" />
        <div class="hero-overlay"></div>
        <h1 v-if="frontmatter.title" class="hero-title">{{ frontmatter.title }}</h1>
      </div>

      <div class="preview-container" :class="{ 'no-hero': !frontmatter.heroImage }">
        
        <h1 v-if="frontmatter.title && !frontmatter.heroImage" class="page-title">
            {{ frontmatter.title }}
        </h1>

        <div class="preview-content markdown-body" ref="previewContainer">
            <div v-html="renderedContent"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
 
$bg-primary: var(--bg-dark-100);
$bg-secondary: var(--bg-dark-200); 
$text-normal: var(--text-primary);
$text-muted: var(--text-secondary);
$text-accent: var(--color-primary); 
$text-accent-hover: var(--color-primary-dim);
$interactive-accent: var(--color-primary);
$border-subtle: var(--border-subtle); 
$code-bg: var(--bg-dark-300); 
$quote-bg: var(--bg-dark-200); 

.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  
   
  background: radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.03) 0%, transparent 20%),
              radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.03) 0%, transparent 20%),
              var(--bg-dark-100);
              
  color: $text-normal;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.25s cubic-bezier(0.2, 0, 0.2, 1);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

@keyframes slideIn {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem; 
  background: rgba(10, 10, 12, 0.8);  
  backdrop-filter: blur(12px);
  border-bottom: 1px solid $border-subtle;
  flex-shrink: 0;
  position: absolute;
  top: 0; left: 0; right: 0;
  z-index: 10;
}

.btn-back {
  background: transparent;
  border: none;
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem;
  border-radius: 4px;
  transition: all 0.2s;
  font-size: 0.9rem;

  &:hover {
    color: $text-normal;
    background: rgba(255,255,255,0.05);
  }
}

.preview-scroller {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding-top: 50px;
}

.preview-scroller::-webkit-scrollbar { width: 10px; }
.preview-scroller::-webkit-scrollbar-track { background: transparent; }
.preview-scroller::-webkit-scrollbar-thumb { background: var(--bg-dark-300); border-radius: 5px; border: 2px solid transparent; background-clip: content-box; }
.preview-scroller::-webkit-scrollbar-thumb:hover { background: var(--color-primary-dim); }

.hero-section {
  position: relative;
  width: 100%;
  height: 350px;
  overflow: hidden;
  margin-bottom: -3rem;  
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 4rem;
  z-index: 0; 
   
}

.hero-image {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover;
  z-index: 1;
}

.hero-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(to bottom, rgba(10,10,12,0.1), var(--bg-dark-100)); 
  z-index: 2;
}

.hero-title {
  position: relative;
  z-index: 3;
  color: white;
  font-size: 3rem;
  font-weight: 800;
  text-align: center;
  text-shadow: 0 4px 20px rgba(0,0,0,0.6);
  margin: 0;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.preview-container {
  max-width: 800px;  
  margin: 0 auto 5rem auto;
  padding: 4rem;
  
  position: relative;
  z-index: 1;

  &.no-hero {
    padding-top: 0;
    margin-top: 2rem;  
  }

  @media (max-width: 768px) {
    margin: 0;
    padding: 20px 15px;  
  }
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem; 
  color: $text-normal;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

 
.preview-content {
  color: $text-normal;
  line-height: 1.6;
  font-size: 16px; 
  
  :deep(p) {
    margin-bottom: 1.25em;
  }

   
  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    color: $text-normal; 
    font-weight: 600;
    margin-top: 2.5em; 
    margin-bottom: 0.5em; 
    line-height: 1.3;
  }
  
  :deep(h1) { font-size: 1.8em; font-weight: 700; }
  :deep(h2) { font-size: 1.6em; font-weight: 600; }
  :deep(h3) { font-size: 1.375em; font-weight: 600; }
  :deep(h4) { font-size: 1.125em; font-weight: 600; }
  :deep(h5) { font-size: 1em; font-weight: 600; color: $text-muted; }
  :deep(h6) { font-size: 0.875em; font-weight: 600; color: $text-muted; text-transform: uppercase; }

   
  :deep(a) {
    color: $text-accent;
    text-decoration: none;
    transition: color 0.1s;
    &:hover {
      color: $text-accent-hover;
      text-decoration: underline;
    }
  }

   
  :deep(strong) { font-weight: 600; color: #fff; } 
  :deep(em) { color: $text-normal; font-style: italic; }

   
  :deep(ul), :deep(ol) {
    padding-left: 3em; 
    margin-bottom: 1.5em;
    
    
    :deep(ul), :deep(ol) {
      margin-top: 0;
      margin-bottom: 0;
    }
  }
  :deep(li) {
    margin-bottom: 0.25em; 
  }
  :deep(li::marker) {
    color: $text-muted; 
  }

   
  :deep(.task-list-item) {
    display: flex;
    align-items: flex-start;
    list-style: none; 
    margin-left: -1.5em; 
    margin-bottom: 0.25em;
  }
  :deep(.task-checkbox) {
    appearance: none;
    -webkit-appearance: none;
    width: 16px; height: 16px;
    border: 1px solid $text-muted;
    border-radius: 3px;
    margin-right: 0.75em;
    margin-top: 0.25em; 
    position: relative;
    cursor: default;
    background: transparent;

    &:checked {
      background-color: $interactive-accent;
      border-color: $interactive-accent;
      &::after {
        content: '';
        position: absolute;
        left: 5px; top: 1px;
        width: 4px; height: 9px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }
  }
  :deep(.task-completed) {
    color: $text-muted;
    text-decoration: line-through;
    opacity: 0.8;
  }

   
  :deep(code) {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85em;
    background-color: rgba(255,255,255,0.05); 
    color: #ff7b72; 
    padding: 0.1em 0.3em;
    border-radius: 4px;
  }
  
  :deep(pre) {
    background-color: $code-bg;
    padding: 1.5rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1.5em 0;
    
    code {
      background: transparent;
      padding: 0;
      color: $text-normal; 
      font-size: 0.9em;
    }
  }

   
  :deep(blockquote) {
    margin: 1.5em 0;
    padding: 0.5em 1em;
    color: $text-muted;
    border-left: 3px solid $interactive-accent;
    background: transparent;
    
    p { margin-bottom: 0.5em; }
    p:last-child { margin-bottom: 0; }
  }

   
  :deep(img) {
    display: block;
    max-width: 100%;
    border-radius: 4px;
    margin: 1.5em auto;
  }

   
  :deep(hr) {
    border: none;
    height: 1px; 
    background: $border-subtle; 
    margin: 3em 0; 
  }

   
  :deep(table) {
    border-collapse: collapse;
    margin: 1.5em 0;
    width: 100%;
    font-size: 0.95em;
    
    th {
      border-bottom: 2px solid #444;
      padding: 0.5em 1em;
      text-align: left;
      font-weight: 600;
    }
    td {
      border-bottom: 1px solid #333;
      padding: 0.5em 1em;
    }
  }
  
   
  :deep(.callout) {
    padding: 1rem;
    margin: 1.5rem 0;
    border-radius: 0.5rem;
    background: rgba(30,30,30,0.4);
    border: 1px solid rgba(255,255,255,0.05);
    border-left: 4px solid #444; 
    
    &.callout-info, &.callout-note { 
        border-left-color: #007bff; background: rgba(0, 123, 255, 0.1); 
        .callout-title { color: #58a6ff; }
    }
    &.callout-warning, &.callout-todo { 
        border-left-color: #ffc107; background: rgba(255, 193, 7, 0.1); 
        .callout-title { color: #ffd54f; }
    }
    &.callout-error, &.callout-danger { 
        border-left-color: #dc3545; background: rgba(220, 53, 69, 0.1); 
        .callout-title { color: #ff7b72; }
    }
    &.callout-success, &.callout-tip { 
        border-left-color: #28a745; background: rgba(40, 167, 69, 0.1); 
        .callout-title { color: #7ee787; }
    }
    &.callout-important { 
        border-left-color: #a882ff; background: rgba(168, 130, 255, 0.1); 
        .callout-title { color: #a882ff; }
    }
    &.callout-caution { 
        border-left-color: #d03544; background: rgba(248, 81, 73, 0.1); 
        .callout-title { color: #d03544; }
    }
  }
  
  :deep(.callout-header) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    line-height: 1;
  }
  
  :deep(.callout-title) {
    font-weight: 600;
    font-size: 0.95rem;
  }
  
  :deep(.callout-content) {
    font-size: 0.95rem;
    color: $text-normal;
    p { margin-bottom: 0.5em; }
  }
}
</style>
