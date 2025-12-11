import { syntaxTree } from '@codemirror/language'
import {
    EditorState,
    RangeSetBuilder
} from '@codemirror/state'
import type { DecorationSet } from '@codemirror/view'
import {
    Decoration,
    EditorView,
    ViewPlugin,
    ViewUpdate,
    WidgetType
} from '@codemirror/view'

/**
 * UTILS
 */

// Check if the current selection (cursor) overlaps with a given range [from, to]
function isCursorInside(state: EditorState, from: number, to: number): boolean {
  const selection = state.selection.main
  // "Touching" usually means the cursor is strictly within, or at the boundaries.
  // Obsidian behaves such that if you are AT the boundary, it reveals.
  // Exception: For block elements like headers, often the whole line context matters.
  // Simplified intersection logic:
  return selection.head >= from && selection.head <= to
}

// Check if cursor is on the specific line
function isCursorOnLine(state: EditorState, lineStart: number, lineEnd: number): boolean {
  const selection = state.selection.main
  return selection.head >= lineStart && selection.head <= lineEnd
}

/**
 * WIDGETS
 */

import { useGitHubStore } from '~/stores/github'

class MediaWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string) {
    super()
  }

  override eq(other: WidgetType) {
    return (
      other instanceof MediaWidget &&
      this.src === other.src &&
      this.alt === other.alt
    )
  }

  override toDOM(view: EditorView) {
    const container = document.createElement('div')
    container.className = 'cm-md-media-container'
    container.style.display = 'block'
    container.style.margin = '0.5em 0'
    container.style.textAlign = 'center' // Optional center

    const store = useGitHubStore()
    
    const load = async () => {
        // If external, just try to render as image
        if (this.src.startsWith('http') || this.src.startsWith('data:')) {
             const img = document.createElement('img')
             img.src = this.src
             img.alt = this.alt
             img.className = 'cm-md-image'
             img.style.maxWidth = '100%'
             img.style.borderRadius = '4px'
             container.appendChild(img)
             return
        }

        // Internal resolution
        const result = await store.resolveFileUrl(this.src)
        if (result) {
            if (result.mime.startsWith('video/')) {
                 const video = document.createElement('video')
                 video.src = result.url
                 video.controls = true
                 video.className = 'cm-md-video'
                 video.style.maxWidth = '100%'
                 video.style.borderRadius = '4px'
                 container.appendChild(video)
            } else {
                 // Image (default) // svg, png, etc
                 const img = document.createElement('img')
                 img.src = result.url
                 img.alt = this.alt
                 img.className = 'cm-md-image'
                 img.style.maxWidth = '100%'
                 img.style.borderRadius = '4px'
                 container.appendChild(img)
            }
        } else {
            // Not found
            const span = document.createElement('span')
            span.textContent = `[Media not found: ${this.src}]`
            span.style.color = '#888'
            span.style.fontSize = '0.9em'
            container.appendChild(span)
        }
    }
    
    load()
    return container
  }
}

class LinkWidget extends WidgetType {
  constructor(readonly text: string, readonly url: string) {
    super()
  }

  override eq(other: WidgetType) {
    return (
      other instanceof LinkWidget &&
      this.text === other.text &&
      this.url === other.url
    )
  }

  override toDOM(view: EditorView) {
    const a = document.createElement('a')
    a.textContent = this.text
    a.className = "cm-md-link"
    a.style.cursor = "pointer"
    a.style.textDecoration = "underline"
    a.style.color = "var(--link-color, #0969da)"
    
    // Attempt to resolve path and href
    // We compute href asynchronously but set it if possible or handle click
    const store = useGitHubStore()
    
    // We set a temporary href or #
    a.href = "#"

    const resolve = async () => {
        const node = store.findNodeByPath(this.url)
        if (node && store.currentRepo) {
             // Construct internal path
             // /repo/[owner]/[repo]/[path]
             const repoFullName = store.currentRepo.full_name
             const href = `/repo/${repoFullName}/${node.path}`
             a.href = href
             
             a.onclick = (e) => {
                 e.preventDefault()
                 // Dispatch event for parent to handle router push
                 const event = new CustomEvent('navigate-file', { detail: href })
                 view.dom.dispatchEvent(event)
             }
        } else {
             // If not found, maybe leave as is or style differently?
             // We'll leave it as # and maybe add title
             a.title = "File not found"
        }
    }
    resolve()

    return a
  }
}

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super()
  }

  override eq(other: WidgetType) {
    return other instanceof CheckboxWidget && this.checked === other.checked
  }

  override toDOM(view: EditorView) {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = this.checked
    input.className = 'cm-md-checkbox'
    input.style.marginRight = '0.5em'
    input.style.cursor = 'pointer'
    
    // We need to capture the exact position to toggle it.
    // However, handling the click event inside toDOM is tricky because we need the position.
    // CodeMirror recommends handling events in the plugin or decoration source, 
    // but the widget DOM click IS the most direct way for UI.
    // We'll rely on a global event handler in the plugin if possible, or bind here carefully.
    
    input.onclick = (e) => {
      // Find the position of this widget in the view
      const pos = view.posAtDOM(input)
      // We need to find the text decoration range to update it.
      // This is a bit complex. Simpler approach:
      // The user clicked. We know the format is `- [ ]` or `- [x]`.
      // We can search the line for that pattern near `pos`.
      
      const line = view.state.doc.lineAt(pos)
      const lineText = line.text
      // Toggle the markdown
      let newLineText = lineText
      if (this.checked) {
        newLineText = lineText.replace(/- \[x\]/i, '- [ ]')
      } else {
        newLineText = lineText.replace(/- \[ \]/, '- [x]')
      }
      
      if (newLineText !== lineText) {
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: newLineText }
        })
      }
    }
    
    return input
  }
}

/**
 * LIVE PREVIEW PLUGIN
 */

const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.compute(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.compute(update.view)
      }
    }

    compute(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>()
      const { state } = view
      const doc = state.doc

      // We need to sort ranges by 'from'. The syntax tree iterator is usually in order.
      // We will collect decorations in a buffer and sort them if necessary, 
      // but iterating the tree sequentially is usually sufficient IF we don't overlap blindly.
      
      for (const { from, to } of view.visibleRanges) {
        syntaxTree(state).iterate({
          from,
          to,
          enter: (node) => {
            const nodeFrom = node.from
            const nodeTo = node.to
            const typeName = node.type.name

            // 1. HEADINGS (ATXHeading)
            // Structure: "ATXHeading1" -> includes "# Header Text"
            // We want to hide the "# " part IF the cursor is NOT on this line.
            // Actually, Obsidian hides the hashes and makes the text big.
            // When cursor is ON the line, hashes reappear.
            if (typeName.startsWith('ATXHeading')) {
              // Check if cursor is on this line
              const line = doc.lineAt(nodeFrom)
              const onLines = isCursorOnLine(state, line.from, line.to)
              
              if (!onLines) {
                // Find where the content starts.
                // The ATXHeading node covers the whole line usually.
                // We need to match the leading hashes.
                const lineText = doc.sliceString(nodeFrom, nodeTo)
                const match = lineText.match(/^(#{1,6}\s+)(.*)$/)
                if (match) {
                  const hashesStr = match[1] || ''
                  const hashesLen = hashesStr.length
                  const contentStr = match[2] || ''
                  
                  // Hide hashes
                  builder.add(
                    nodeFrom,
                    nodeFrom + hashesLen,
                    Decoration.replace({}) // Hidden completely
                  )
                  
                  // Style the rest as a header
                  const level = typeName.match(/\d$/)?.[0] || '1'
                  builder.add(
                    nodeFrom + hashesLen,
                    nodeTo,
                    Decoration.mark({
                      class: `cm-md-header cm-header-${level}`
                    })
                  )
                }
              } else {
                // Cursor IS on line: Show hashes, but maybe still style the size?
                // Obsidian usually shows raw text in correct size when active.
                const level = typeName.match(/\d$/)?.[0] || '1'
                builder.add(
                  nodeFrom,
                  nodeTo,
                  Decoration.mark({
                    class: `cm-md-header cm-header-${level}` // Keep size even when editing? Obsidian does this.
                  })
                )
              }
            }

            // 2. BOLD, ITALIC & STRIKETHROUGH (Emphasis, StrongEmphasis, Strikethrough)
            else if (typeName === 'Emphasis' || typeName === 'StrongEmphasis' || typeName === 'Strikethrough') {
              // Markers: * or _ (em), ** or __ (strong), ~~ (strikethrough)
              // We need to find the markers inside this node.
              // Lezer-markdown provides specific child nodes for markers: "EmphasisMark" usually.
              // But iterating children inside 'enter' is manual.
              // Simpler: Check cursor overlap with the whole node.
              
              const overlapped = isCursorInside(state, nodeFrom, nodeTo)
              
              if (!overlapped) {
                 // We want to hide the markers.
                 // The node contains the markers + content.
                 // e.g. "**foo**" or "~~foo~~" -> from...to
                 // We rely on the fact that markers are at the edges.
                 // Length of markers depends on type.
                 const text = doc.sliceString(nodeFrom, nodeTo)
                 
                 // Heuristic for standard markdown:
                 // Strong: ** or __ (len 2)
                 // Em: * or _ (len 1)
                 // Strikethrough: ~~ (len 2)
                 let markerLen = 1
                 if (typeName === 'StrongEmphasis' || typeName === 'Strikethrough') markerLen = 2
                 
                 // Determine the CSS class based on type
                 let cssClass = 'cm-md-italic'
                 if (typeName === 'StrongEmphasis') cssClass = 'cm-md-bold'
                 else if (typeName === 'Strikethrough') cssClass = 'cm-md-strikethrough'
                 
                 // Safety check: ensure text actually starts/ends with valid markers
                 // (Edge cases exist, just being safe)
                 if (text.length >= markerLen * 2) {
                   // Hide Opening Marker
                   builder.add(nodeFrom, nodeFrom + markerLen, Decoration.replace({}))
                   
                   // Style Content
                   builder.add(
                     nodeFrom + markerLen, 
                     nodeTo - markerLen, 
                     Decoration.mark({
                       class: cssClass
                     })
                   )
                   
                   // Hide Closing Marker
                   builder.add(nodeTo - markerLen, nodeTo, Decoration.replace({}))
                 }
              } else {
                // Formatting shows up (raw text), but we can still apply style (bold/italic) to the whole thing?
                // Obsidian reveals raw syntax mostly unstyled or lightly styled.
                // Let's keep it raw to be safe/rigorous to "Syntax Expansion".
              }
            }

            // 3. IMAGES (Image)
            // Structure: ![alt](src)
            else if (typeName === 'Image') {
              const line = doc.lineAt(nodeFrom)
              // const onEffects = isCursorOnLine(state, line.from, line.to) 
              const overlapped = isCursorInside(state, nodeFrom, nodeTo)

              // If cursor is not touching the image code -> Show Widget, Hide Text
              if (!overlapped) { 
                // Parse src and alt
                const text = doc.sliceString(nodeFrom, nodeTo)
                // Regex to capture ![alt](src)
                const imgMatch = text.match(/^!\[(.*?)\]\((.*?)\)$/)
                if (imgMatch) {
                  const alt = imgMatch[1] || ''
                  const src = imgMatch[2] || ''
                  
                  builder.add(
                    nodeFrom,
                    nodeTo,
                    Decoration.replace({
                      widget: new MediaWidget(src, alt),
                      block: false 
                    })
                  )
                }
              }
            }
            
            // 4. CHECKBOXES (Task)
            // Lezer markdown parses list items. We look for the task marker.
            // Usually "Task" type or "TaskMarker" inside "ListItem"
            // Let's use a simpler regex MatchDecorator approach for checkboxes OR handle it here if found.
            // Checkboxes in MD are `[ ]` or `[x]`. 
            // In Lezer-markdown, they appear as `TaskMarker` node.
            
            // 4. CHECKBOXES (Task)
            else if (typeName === 'TaskMarker') {
               // content is `[ ]` or `[x]`
               const text = doc.sliceString(nodeFrom, nodeTo)
               const isChecked = text.toLowerCase().includes('x')
               
               builder.add(
                 nodeFrom,
                 nodeTo,
                 Decoration.replace({
                   widget: new CheckboxWidget(isChecked)
                 })
               )
             }

            // 6. LINKS (Link)
            else if (typeName === 'Link') {
                 const overlapped = isCursorInside(state, nodeFrom, nodeTo)
                 if (!overlapped) {
                     const textContent = doc.sliceString(nodeFrom, nodeTo)
                     // Format: [text](url)
                     const linkMatch = textContent.match(/^\[(.*?)\]\((.*?)\)$/)
                     if (linkMatch) {
                         const label = linkMatch[1] || ''
                         const url = linkMatch[2]
                         // Only process internal links (no protocol)
                         if (url && !url.match(/^[a-z]+:\/\//)) {
                             builder.add(
                                 nodeFrom, 
                                 nodeTo, 
                                 Decoration.replace({
                                     widget: new LinkWidget(label, url)
                                 })
                             )
                         }
                     }
                 }
            }

             // 5. CODE BLOCKS (FencedCode)
             // We want a nice background for the whole block.
             // FencedCode includes the markers (```) and content.
             else if (typeName === 'FencedCode') {
               // We need to apply a LINE decoration to every line in this range.
               // builder.add for line decoration must be at the start of the line?
               // Actually, Decoration.line is point-based (start of line).
               
               const startLine = doc.lineAt(nodeFrom)
               const endLine = doc.lineAt(nodeTo)
               
               // Iterate lines from start to end
               for (let i = startLine.number; i <= endLine.number; i++) {
                 const lineObj = doc.line(i)
                 // Determine classes
                 const classes = ['cm-md-code-line']
                 if (i === startLine.number) classes.push('cm-md-code-start')
                 if (i === endLine.number) classes.push('cm-md-code-end')
                 
                 // We must add line decorations at the start of the line.
                 // RangeSetBuilder expects additions to be sorted by `from`.
                 // CAUTION: iterating `syntaxTree` gives us nodes. 
                 // If we add decorations for EACH line inside the node loop, we might break the "sorted by from" rule 
                 // if this node overlaps with others or if we process in a way that jumps back.
                 // However, FencedCode is a block level element, usually dominant.
                 // BUT: The loop we are in (`syntaxTree(...).iterate`) goes through nodes.
                 // If we manually loop lines *inside* this node, we obey the `node.from` order mostly, 
                 // but line/point decorations for intermediate lines `startLine + 1` happen *after* `node.from`.
                 // As long as we add them in increasing order, it's ok.
                 // Wait: if `syntaxTree` enters a child node *inside* FencedCode (e.g. CodeMark), 
                 // we might try to add decorations out of order if we handle `FencedCode` (parent) then children.
                 // LUCKILY: `enter` is called for parent first. 
                 // So we add for ALL lines now?
                 // If we do that, we must be sure we don't double-add or add out of order relative to *other* nodes visited later.
                 // `RangeSetBuilder` requires strictly sorted insertion.
                 // If we add a decoration at `line 2` start, then `enter` visits a child at `line 1` content... that's fine?
                 // NO. Builder cursor MUST move forward.
                 // If we add for line 100 while at node start (say line 90), and then visit a child at line 90+delta, we might error if child starts *before* line 100? No, that's fine.
                 // Error is if we add at 100, then try to add at 95.
                 // Since `enter` visits in order of `from`...
                 // If FencedCode starts at 100. We add decorations for 100, 101, 102...
                 // Then `enter` visits `CodeMark` at 100. We might try to add something at 100 => OK (same pos).
                 // What if next sibling is at 150? OK.
                 // What if child is at 101? We added decoration at 101 already (which is > 100).
                 // Then we visit child at 101. We try to add decoration at 101.
                 // Since 101 >= 101, it SHOULD be ok?
                 // Actually, RangeSetBuilder requires `from` to be >= last `to`.
                 // Line decorations are point decorations (length 0 usually? or line length?)
                 // Decoration.line length is 0 (it's associated with the line break/start).
                 // So adding at 100, then 101... current pos is 101.
                 // Next node `CodeMark` starts at 100.
                 // OPS! We moved builder to 101. We cannot go back to 100.
                 
                 // SOLUTION: We cannot process "Whole Block" ranges inside `enter` if we want to add separate decorations for internal lines 
                 // AND still process children that start earlier.
                 // Or we must ensure we don't visit children? `return false` skips children.
                 // Yes! `FencedCode` leaf content is just text mostly (handled by highlighter).
                 // The only children are CodeMark and CodeInfo. We probably don't need to decorate them specifically if we have the whole block style.
                 // So we can return `false` to skip children!
                 
                 builder.add(
                   lineObj.from,
                   lineObj.from,
                   Decoration.line({
                     class: classes.join(' ')
                   })
                 )
               }
               return false // Skip children to avoid out-of-order errors with RangeSetBuilder
             }
          }
        })
      }

      return builder.finish()
    }
  },
  {
    decorations: (v) => v.decorations
  }
)

export const livePreviewExtension = [
  livePreviewPlugin,
  EditorView.lineWrapping // Essential for documents
]
