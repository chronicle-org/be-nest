import sanitizeHtml from "sanitize-html";

// Video embeds the editors produce; any other iframe source is dropped.
const ALLOWED_IFRAME_HOSTS = [
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
];

const COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i;

/**
 * Keeps what the Quill editors (web and mobile) can produce and strips
 * everything else: scripts, event handlers, forms, arbitrary iframes and
 * styles. Formatting such as alignment, size and indent is carried by
 * Quill's own `ql-*` classes, so only those classes are kept.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "span",
    "div",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "strike",
    "sub",
    "sup",
    "blockquote",
    "pre",
    "code",
    "ol",
    "ul",
    "li",
    "a",
    "img",
    "iframe",
  ],
  allowedAttributes: {
    "*": ["class", "style"],
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    iframe: ["src", "frameborder", "allowfullscreen"],
    li: ["data-list"],
    span: ["data-value", "contenteditable"],
    pre: ["spellcheck"],
    div: ["data-language"],
  },
  allowedClasses: { "*": ["ql-*"] },
  allowedStyles: {
    "*": { color: [COLOR], "background-color": [COLOR] },
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowedIframeHostnames: ALLOWED_IFRAME_HOSTS,
  allowProtocolRelative: false,
  // Drop iframes whose src was removed above instead of leaving empty frames.
  exclusiveFilter: (frame) => frame.tag === "iframe" && !frame.attribs.src,
  transformTags: {
    // Links open in a new tab without giving the target page access to ours.
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer",
    }),
  },
};

export function sanitizeRichText(html: string): string;
export function sanitizeRichText(html: string | undefined): string | undefined;
export function sanitizeRichText(html?: string): string | undefined {
  return html === undefined ? undefined : sanitizeHtml(html, OPTIONS);
}
