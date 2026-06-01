import Link from "next/link";
import type { ReactNode } from "react";

type ButtonProps = {
  href?: string;
  children: ReactNode;
  tone?: "blue" | "lime" | "ghost" | "red";
  size?: "sm" | "md";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

export function Button({ href, children, tone = "ghost", size = "md", type = "button", onClick, disabled }: ButtonProps) {
  const className = `btn ${tone} ${size === "sm" ? "sm" : ""}`;
  if (href) return <Link className={className} href={href}>{children}</Link>;
  return <button className={className} type={type} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function PageLabel({ children }: { children: ReactNode }) {
  return <span className="page-label">{children}</span>;
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p>{text}</p>
      {action ? <div className="actions">{action}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "green" | "orange" | "blue" | "red" | "gray" | "lime" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function SectionHead({ label, title, text, action }: { label?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div>
        {label ? <PageLabel>{label}</PageLabel> : null}
        <h1>{title}</h1>
        {text ? <p className="sub">{text}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, text, children }: { title?: string; text?: string; children?: ReactNode }) {
  return (
    <div className="card">
      {title ? <h3>{title}</h3> : null}
      {text ? <p>{text}</p> : null}
      {children}
    </div>
  );
}
