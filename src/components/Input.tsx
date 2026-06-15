"use client";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  type?: string;
  disabled?: boolean;
  className?: string;
}

export function Input({
  label,
  placeholder,
  value,
  onChange,
  error,
  helperText,
  type = "text",
  disabled = false,
  className = "",
}: InputProps) {
  const hasError = !!error;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`
          h-11 px-4 text-base rounded-[14px]
          border bg-card-bg
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          ${hasError
            ? "border-error focus:ring-error/20 focus:border-error"
            : "border-border hover:border-border-hover"
          }
        `}
      />
      {(error || helperText) && (
        <span className={`text-xs ${hasError ? "text-error" : "text-text-muted"}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
}