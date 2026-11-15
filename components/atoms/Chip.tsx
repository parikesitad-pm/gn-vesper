/**
 * The one pill-shaped interactive element.
 *
 * It is used for example suggestions in the notch and on the page, and for the notch's submit button. The
 * element stays a real `<button>` so keyboard, disabled and focus behaviour are the platform's, not ours.
 */
import type { ButtonHTMLAttributes } from "react";
import "./Chip.css";

export function Chip({ type = "button", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`chip${className ? ` ${className}` : ""}`} {...props} />;
}
