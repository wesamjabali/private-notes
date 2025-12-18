export const highlight = {
  defineNodes: ["Highlight"],
  parseInline: [
    {
      name: "Highlight",
      parse(cx: any, next: number, pos: number) {
        if (next != 61 || cx.char(pos + 1) != 61) {
            return -1;
        }

        const start = pos;
        const endDelim = "==";
        let end = start + 2;
        let foundEnd = false;

        while (end < cx.end) {
            if (cx.slice(end, end + 2) == endDelim) {
                foundEnd = true;
                break;
            }
            end++;
        }

        if (foundEnd) {
             return cx.addElement(cx.elt("Highlight", start, end + 2));
        }

        return -1;
      },
    },
  ],
};
