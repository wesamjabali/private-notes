import type MarkdownIt from "markdown-it";
import type { Token } from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";

const ALERT_MARKER_REGEX = /(?:^|\n)\s*\[!(\w+)\]\s?(.*)/g;

const ICON_MAP: Record<string, string> = {
  info: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  note: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  warning: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  danger: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  tip: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  important: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  caution: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 4.9V17l-9 4.9L3 17V6.9L12 2z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
};

interface AlertMatch {
  type: string;
  title: string;
  fullMatch: string;
  index: number;
}

function matchAlertMarker(content: string): AlertMatch | null {
  const regex = new RegExp(ALERT_MARKER_REGEX.source, "g");
  const matches = Array.from(content.matchAll(regex));
  const firstMatch = matches[0];

  if (!firstMatch || firstMatch.index !== 0 || !firstMatch[1] || !firstMatch[0]) {
    return null;
  }

  const alertType = firstMatch[1].toLowerCase();
  const rawTitle = firstMatch[2];

  return {
    type: alertType,
    title: rawTitle || alertType.charAt(0).toUpperCase() + alertType.slice(1),
    fullMatch: firstMatch[0],
    index: firstMatch.index,
  };
}

function findFirstParagraphIndex(
  tokens: Token[],
  startIndex: number,
  closeIndex: number
): number {
  for (let j = startIndex + 1; j < closeIndex; j++) {
    const token = tokens[j];
    if (!token) continue;

    if (token.type === "paragraph_open") {
      return j;
    }
    if (token.type === "blockquote_open" || token.type === "list_item_open") {
      break;
    }
  }
  return -1;
}

function findBlockQuoteClose(tokens: Token[], startIndex: number): number {
  let level = 0;
  for (let i = startIndex; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    if (token.type === "blockquote_open") level++;
    if (token.type === "blockquote_close") {
      level--;
      if (level === 0) return i;
    }
  }
  return -1;
}

function getEjectionLine(
  openToken: Token,
  src: string | undefined
): number {
  if (!openToken.map || !src) return -1;

  const [startLine, endLine] = openToken.map;
  const srcLines = src.split(/\r?\n/);

  for (let l = startLine; l < endLine; l++) {
    const line = srcLines[l];
    if (line === undefined) continue;
    if (!/^\s*>/.test(line)) {
      return l;
    }
  }
  return -1;
}

function createHeaderTokens(
  state: StateCore,
  alertType: string,
  title: string
): Token[] {
  const headerTokens: Token[] = [];
  const iconHTML = ICON_MAP[alertType] || ICON_MAP["note"] || "";

  const divHeaderOpen = new state.Token("div_open", "div", 1);
  divHeaderOpen.attrs = [["class", "callout-header"]];
  headerTokens.push(divHeaderOpen);

  const spanIconOpen = new state.Token("span_open", "span", 1);
  spanIconOpen.attrs = [["class", "callout-icon"]];
  headerTokens.push(spanIconOpen);

  const htmlIcon = new state.Token("html_inline", "", 0);
  htmlIcon.content = iconHTML;
  headerTokens.push(htmlIcon);

  const spanIconClose = new state.Token("span_close", "span", -1);
  headerTokens.push(spanIconClose);

  const spanTitleOpen = new state.Token("span_open", "span", 1);
  spanTitleOpen.attrs = [["class", "callout-title"]];
  headerTokens.push(spanTitleOpen);

  const textTitle = new state.Token("text", "", 0);
  textTitle.content = title;
  headerTokens.push(textTitle);

  const spanTitleClose = new state.Token("span_close", "span", -1);
  headerTokens.push(spanTitleClose);

  const divHeaderClose = new state.Token("div_close", "div", -1);
  headerTokens.push(divHeaderClose);

  return headerTokens;
}

export default function markdownItGitHubAlerts(md: MarkdownIt) {
  md.core.ruler.after("block", "github_alerts", (state) => {
    const tokens = state.tokens;
    if (!tokens) return;

    for (let i = 0; i < tokens.length; i++) {
      const openToken = tokens[i];
      if (!openToken || openToken.type !== "blockquote_open") continue;

      const closeIndex = findBlockQuoteClose(tokens, i);
      if (closeIndex === -1) continue;

      let firstPIndex = findFirstParagraphIndex(tokens, i, closeIndex);
      if (firstPIndex === -1) continue;

      const firstInline = tokens[firstPIndex + 1];
      if (!firstInline || firstInline.type !== "inline") continue;

      const alertMatch = matchAlertMarker(firstInline.content);
      if (!alertMatch) continue;

      const { type: alertType, title: alertTitle, fullMatch } = alertMatch;

      openToken.tag = "div";
      openToken.attrs = [["class", `callout callout-${alertType}`]];

      const headerTokens = createHeaderTokens(state, alertType, alertTitle);
      const divContentOpen = new state.Token("div_open", "div", 1);
      divContentOpen.attrs = [["class", "callout-content"]];

      const cutLength = fullMatch.length;
      let strippedNewline = false;
      firstInline.content = firstInline.content.slice(cutLength);

      const newlineMatch = firstInline.content.match(/^([\s]*\n)/);
      if (newlineMatch && newlineMatch[0]) {
        firstInline.content = firstInline.content.substring(
          newlineMatch[0].length
        );
        strippedNewline = true;
      }

      tokens.splice(i + 1, 0, ...headerTokens, divContentOpen);

      const insertedCount = headerTokens.length + 1;
      let currentCloseIndex = closeIndex + insertedCount;
      firstPIndex += insertedCount;

      const ejectionLine = getEjectionLine(openToken, state.src);

      let cursor = firstPIndex;

      while (cursor < currentCloseIndex) {
        const token = tokens[cursor];
        if (!token) {
          cursor++;
          continue;
        }

        if (token.type === "blockquote_open") {
          const nestedClose = findBlockQuoteClose(tokens, cursor);
          if (nestedClose !== -1) {
            cursor = nestedClose;
          }
          cursor++;
          continue;
        }

        if (
          token.type === "paragraph_open" &&
          ejectionLine !== -1 &&
          token.map
        ) {
          const [start] = token.map;

          if (start >= ejectionLine) {
            const divContentClose = new state.Token("div_close", "div", -1);
            const divCalloutClose = new state.Token("div_close", "div", -1);

            tokens.splice(cursor, 0, divContentClose, divCalloutClose);
            currentCloseIndex += 2;
            cursor += 2;

            tokens.splice(currentCloseIndex, 1);
            break;
          }
        }

        if (token.type === "inline") {
          const content = token.content;
          let splitIndex = -1;
          let splitType = "match";
          let newCalloutType = "";
          let newCalloutTitle = "";

          if (ejectionLine !== -1) {
            const doubleNewlineIndex = content.indexOf("\n\n");
            if (doubleNewlineIndex !== -1) {
              splitIndex = doubleNewlineIndex;
              splitType = "ejection";
            } else {
              let pStartLine = -1;
              const prevToken = tokens[cursor - 1];
              if (
                prevToken &&
                prevToken.type === "paragraph_open" &&
                prevToken.map
              ) {
                pStartLine = prevToken.map[0];
              }

              if (
                pStartLine !== -1 &&
                strippedNewline &&
                cursor === firstPIndex + 1
              ) {
                pStartLine += 1;
              }

              if (pStartLine !== -1 && pStartLine < ejectionLine) {
                const relativeEject = ejectionLine - pStartLine;
                let newlinesFound = 0;

                if (relativeEject <= 0) {
                  splitIndex = 0;
                  splitType = "ejection";
                } else {
                  for (let c = 0; c < content.length; c++) {
                    if (content[c] === "\n") {
                      newlinesFound++;
                      if (newlinesFound === relativeEject) {
                        splitIndex = c;
                        splitType = "ejection";
                        break;
                      }
                    }
                  }
                }
              }
            }
          }

          const innerMatches = Array.from(
            content.matchAll(/(?:^|\n)\s*\[!(\w+)\]\s?(.*)/g)
          );

          if (innerMatches.length > 0) {
            const m = innerMatches[0];

            if (
              m &&
              m.index !== undefined &&
              (splitIndex === -1 || m.index < splitIndex)
            ) {
              splitIndex = m.index;
              splitType = "match";
              if (!m[1]) continue;
              newCalloutType = m[1].toLowerCase();
              newCalloutTitle =
                m[2] ||
                newCalloutType.charAt(0).toUpperCase() + newCalloutType.slice(1);
            }
          }

          if (splitIndex !== -1) {
            const preText = content.slice(0, splitIndex);

            let startPost = splitIndex;
            if (splitType === "ejection") startPost += 1;

            if (splitType === "match") {
              const m = innerMatches[0];
              if (m && m[0]) {
                startPost += m[0].length;
              }
            }

            const postText = content.slice(startPost);

            token.content = preText;

            const newInline = new state.Token("inline", "", 0);
            newInline.content = postText;
            newInline.level = token.level;
            newInline.children = [];

            const pCloseNew = new state.Token("paragraph_close", "p", -1);
            const divContentClose = new state.Token("div_close", "div", -1);
            const divCalloutClose = new state.Token("div_close", "div", -1);

            const pOpenNew = new state.Token("paragraph_open", "p", 1);

            let tokensToInsert: Token[] = [];

            if (splitType === "match") {
              const divCalloutOpen = new state.Token("div_open", "div", 1);
              divCalloutOpen.attrs = [
                ["class", `callout callout-${newCalloutType}`],
              ];
              const newHeaderTokens = createHeaderTokens(
                state,
                newCalloutType,
                newCalloutTitle
              );
              const newDivContentOpen = new state.Token("div_open", "div", 1);
              newDivContentOpen.attrs = [["class", "callout-content"]];

              tokensToInsert = [
                pCloseNew,
                divContentClose,
                divCalloutClose,
                divCalloutOpen,
                ...newHeaderTokens,
                newDivContentOpen,
                pOpenNew,
                newInline,
              ];
            } else {
              const alertInPostMatch = postText.match(
                /^([\s\S]*?)(?:^|\n)\s*\[!(\w+)\]\s?(.*)/m
              );

              if (
                alertInPostMatch &&
                alertInPostMatch[2] &&
                alertInPostMatch[0]
              ) {
                const plainText = alertInPostMatch[1] || "";
                const newAlertType = alertInPostMatch[2].toLowerCase();
                const newAlertTitle =
                  alertInPostMatch[3] ||
                  newAlertType.charAt(0).toUpperCase() + newAlertType.slice(1);

                const afterMarkerIndex =
                  (alertInPostMatch.index || 0) + alertInPostMatch[0].length;
                const alertContent = postText.slice(afterMarkerIndex);

                const plainInline = new state.Token("inline", "", 0);
                plainInline.content = plainText.trim();
                plainInline.level = token.level;
                plainInline.children = [];

                const divCalloutOpen = new state.Token("div_open", "div", 1);
                divCalloutOpen.attrs = [
                  ["class", `callout callout-${newAlertType}`],
                ];
                const newHeaderTokens = createHeaderTokens(
                  state,
                  newAlertType,
                  newAlertTitle
                );
                const newDivContentOpen = new state.Token("div_open", "div", 1);
                newDivContentOpen.attrs = [["class", "callout-content"]];

                const pOpen2 = new state.Token("paragraph_open", "p", 1);
                const alertInline = new state.Token("inline", "", 0);

                alertInline.content = alertContent
                  .replace(/^\s*>\s?/gm, "")
                  .trim();
                alertInline.level = token.level;
                alertInline.children = [];
                const pClose2 = new state.Token("paragraph_close", "p", -1);

                const divContentClose2 = new state.Token("div_close", "div", -1);
                const divCalloutClose2 = new state.Token("div_close", "div", -1);

                if (plainText.trim()) {
                  tokensToInsert = [
                    pCloseNew,
                    divContentClose,
                    divCalloutClose,
                    pOpenNew,
                    plainInline,
                    new state.Token("paragraph_close", "p", -1),
                    divCalloutOpen,
                    ...newHeaderTokens,
                    newDivContentOpen,
                    pOpen2,
                    alertInline,
                    pClose2,
                    divContentClose2,
                    divCalloutClose2,
                  ];
                } else {
                  tokensToInsert = [
                    pCloseNew,
                    divContentClose,
                    divCalloutClose,
                    divCalloutOpen,
                    ...newHeaderTokens,
                    newDivContentOpen,
                    pOpen2,
                    alertInline,
                    pClose2,
                    divContentClose2,
                    divCalloutClose2,
                  ];
                }

                tokens.splice(cursor + 1, 0, ...tokensToInsert);
                const added = tokensToInsert.length;
                currentCloseIndex += added;
                cursor += added;
                tokens.splice(currentCloseIndex, 1);
                break;
              } else {
                tokensToInsert = [
                  pCloseNew,
                  divContentClose,
                  divCalloutClose,
                  pOpenNew,
                  newInline,
                ];
              }
            }

            tokens.splice(cursor + 1, 0, ...tokensToInsert);

            const added = tokensToInsert.length;
            currentCloseIndex += added;
            cursor += added;

            if (splitType === "ejection") {
              tokens.splice(currentCloseIndex, 1);

              break;
            }

            continue;
          }
        }

        cursor++;
      }

      const potentialCloseToken = tokens[currentCloseIndex];
      if (
        cursor >= currentCloseIndex &&
        potentialCloseToken &&
        potentialCloseToken.type === "blockquote_close"
      ) {
        const closeToken = potentialCloseToken;
        closeToken.tag = "div";

        const divContentCloseFinal = new state.Token("div_close", "div", -1);
        tokens.splice(currentCloseIndex, 0, divContentCloseFinal);

        i = currentCloseIndex + 1;
      } else {
        i = cursor;
      }
    }
  });
}
