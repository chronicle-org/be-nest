import { sanitizeRichText } from "./sanitize-html";

describe("sanitizeRichText", () => {
  it("keeps Quill formatting", () => {
    const html =
      '<p class="ql-align-center"><strong>Bold</strong> <span style="color: rgb(230, 0, 0);">red</span></p>' +
      '<ol><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>item</li></ol>' +
      '<iframe class="ql-video" frameborder="0" allowfullscreen="true" src="https://www.youtube.com/embed/abc"></iframe>';
    const clean = sanitizeRichText(html);
    expect(clean).toContain('<p class="ql-align-center"><strong>Bold</strong>');
    expect(clean).toContain('style="color:rgb(230, 0, 0)"');
    expect(clean).toContain('<li data-list="bullet">');
    expect(clean).toContain('src="https://www.youtube.com/embed/abc"');
  });

  it("removes scripts, event handlers and script links", () => {
    const clean = sanitizeRichText(
      '<img src="x" onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(2)">x</a>',
    );
    expect(clean).not.toMatch(/script|onerror|javascript:/i);
  });

  it("drops iframes from other sites, layout styles and non-Quill classes", () => {
    const clean = sanitizeRichText(
      '<iframe src="https://evil.example/x"></iframe>' +
        '<div style="position:fixed;top:0">overlay</div>' +
        '<p class="evil ql-indent-1">x</p>',
    );
    expect(clean).toBe('<div>overlay</div><p class="ql-indent-1">x</p>');
  });

  it("opens links in a new tab safely", () => {
    expect(sanitizeRichText('<a href="https://x.com">x</a>')).toBe(
      '<a href="https://x.com" target="_blank" rel="noopener noreferrer">x</a>',
    );
  });

  it("leaves undefined alone so partial updates keep the old value", () => {
    expect(sanitizeRichText(undefined)).toBeUndefined();
  });
});
