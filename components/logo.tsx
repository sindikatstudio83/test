import Image from "next/image";
import logoLight from "@/public/logo-mark-light.png";
import logoDark from "@/public/logo-mark-dark.png";

/**
 * Brand logo mark (the "ip" icon with red dot).
 * Renders BOTH theme variants and shows the correct one via CSS,
 * so it works in light/dark mode without JS / hydration flicker.
 *
 * `withText` keeps the "imaposla.me" wordmark as crisp HTML next to the mark
 * (better for SEO + scaling than baking text into an image).
 */
export function Logo({ size = 34, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="brand-logo" aria-label="imaposla.me">
      <Image
        src={logoDark}
        alt=""
        height={size}
        width={Math.round((size * logoDark.width) / logoDark.height)}
        className="brand-logo__img brand-logo__img--light"
        priority
      />
      <Image
        src={logoLight}
        alt=""
        height={size}
        width={Math.round((size * logoLight.width) / logoLight.height)}
        className="brand-logo__img brand-logo__img--dark"
        priority
      />
      {withText && (
        <span className="brand-logo__text">imaposla<span className="brand-dot">.me</span></span>
      )}
    </span>
  );
}
