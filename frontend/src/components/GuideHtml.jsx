import { useMemo } from "react";
import DOMPurify from "dompurify";

// Guide text ships as HTML in the guide JSON. Sanitize anyway: it is rendered into the page.
const CONFIG = {
  ALLOWED_TAGS: ["p", "pre", "h5", "br", "strong", "em", "b", "i", "ul", "ol", "li", "a", "section"],
  ALLOWED_ATTR: ["href", "target", "rel"],
};

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export default function GuideHtml({ html, className }) {
  const clean = useMemo(() => DOMPurify.sanitize(html ?? "", CONFIG), [html]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
