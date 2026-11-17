import { useState } from "react";
import { Input } from "@/components/ui/input";

// An Input that fires `onActivate` when pressed while it already has focus.
// The first tap focuses the field; tapping the focused field again opens its
// popup (calculator / picker).
export default function RepressInput({ onActivate, value, className = "", ...props }) {
  const [focused, setFocused] = useState(false);
  const isEmpty = value === "" || value == null;

  return (
    <Input
      {...props}
      value={value}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPointerDown={(e) => {
        if (focused && isEmpty) {
          e.preventDefault();
          onActivate?.();
        }
      }}
      className={className}
    />
  );
}