import { useLayoutEffect, useRef, useState } from "react";

/**
 * Renders text that keeps its base font size when it fits, and shrinks it
 * down to fit on a single line only when it would otherwise overflow.
 */
export default function ShrinkText({
  children,
  className = "",
  basePx = 16,
  minPx = 9,
  as: Tag = "span",
  title,
}) {
  const ref = useRef(null);
  const [fontSize, setFontSize] = useState(basePx);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const available = el.clientWidth;
      if (available <= 0) return;
      el.style.fontSize = `${basePx}px`;
      if (el.scrollWidth <= available) {
        setFontSize(basePx);
        return;
      }
      let size = basePx;
      while (size > minPx && el.scrollWidth > available) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
      setFontSize(size);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, basePx, minPx]);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        fontSize: `${fontSize}px`,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={title}
    >
      {children}
    </Tag>
  );
}