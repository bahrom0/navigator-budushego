"use client";

import {
  BookOpen,
  Building2,
  Code2,
} from "lucide-react";

interface CoachGoalManualFormProps {
  nctCode: string;
  nctTitle: string;
  university: string;
  onChangeCode: (value: string) => void;
  onChangeTitle: (value: string) => void;
  onChangeUniversity: (value: string) => void;
}

const TITLE_MAX = 200;
const UNIVERSITY_MAX = 200;

export function CoachGoalManualForm({
  nctCode,
  nctTitle,
  university,
  onChangeCode,
  onChangeTitle,
  onChangeUniversity,
}: CoachGoalManualFormProps) {
  return (
    <div className="mt-5 space-y-3">
      <LabeledField
        label="Код НЦТ"
        icon={Code2}
        placeholder="Например, 6B06101"
        value={nctCode}
        onChange={onChangeCode}
        maxLength={20}
      />
      <LabeledField
        label="Название специальности"
        icon={BookOpen}
        placeholder="Например, Программная инженерия"
        value={nctTitle}
        onChange={onChangeTitle}
        maxLength={TITLE_MAX}
      />
      <LabeledField
        label="Университет (опционально)"
        icon={Building2}
        placeholder="Например, Назарбаев Университет"
        value={university}
        onChange={onChangeUniversity}
        maxLength={UNIVERSITY_MAX}
      />
  </div>
  );
}

interface LabeledFieldProps {
  label: string;
  icon: typeof Code2;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}

function LabeledField({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  maxLength,
}: LabeledFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-secondary">
        {label}
    </span>
      <span className="relative block">
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <input
          type="text"
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-[12px] border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-text-muted focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
    </span>
  </label>
  );
}
