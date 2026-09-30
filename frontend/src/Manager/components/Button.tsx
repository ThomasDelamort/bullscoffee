import type { ComponentPropsWithoutRef } from "react";
import type { IconType } from "react-icons";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./styles";

interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconType;
}

export default function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...rest}>
      {Icon && <Icon aria-hidden className={size === "sm" ? "size-3.5" : "size-4"} />}
      {children}
    </button>
  );
}
