"use client";

import { useState } from "react";

/** two taps so a slip can't delete anything: "delete" then "yes, delete" */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  className = "",
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className={`min-h-11 rounded-full px-4 text-sm font-bold underline underline-offset-4 ${className}`}>
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={onConfirm} className="btn-primary min-h-11 px-4 text-sm">
        {confirmLabel}
      </button>
      <button type="button" onClick={() => setArmed(false)} className="min-h-11 rounded-full px-3 text-sm font-bold underline underline-offset-4">
        keep it
      </button>
    </span>
  );
}
