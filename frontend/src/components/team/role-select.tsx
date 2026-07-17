"use client";

import { ROLE_META } from "@/components/team/team-constants";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/schemas/employee.schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

export function RoleSelect({
  value,
  onChange,
  disabled,
  id,
  size = "default",
  className,
}: {
  value: AppRole;
  onChange: (role: AppRole) => void;
  disabled?: boolean;
  id?: string;
  size?: "sm" | "default";
  className?: string;
}) {
  const meta = ROLE_META[value];

  return (
    <Select value={value} onValueChange={(next) => onChange(next as AppRole)} disabled={disabled}>
      <SelectTrigger
        id={id}
        size={size}
        aria-label="App role"
        className={cn(
          "min-w-[7.5rem]",
          value === "admin" && "border-primary/35 text-foreground",
          className,
        )}
      >
        <meta.Icon
          className={cn("size-3.5", value === "admin" ? "text-primary" : "text-muted-foreground")}
        />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[14rem]">
        {(Object.keys(ROLE_META) as AppRole[]).map((role) => {
          const option = ROLE_META[role];
          return (
            <SelectItem
              key={role}
              value={role}
              textValue={option.label}
              className="items-start py-2.5"
            >
              <span className="flex gap-2.5 [[data-slot=select-value]_&]:contents">
                <option.Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0 [[data-slot=select-value]_&]:hidden",
                    role === "admin" ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="flex flex-col gap-0.5 [[data-slot=select-value]_&]:contents">
                  <span className="font-medium leading-none [[data-slot=select-value]_&]:font-normal">
                    {option.label}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground text-pretty [[data-slot=select-value]_&]:hidden">
                    {option.description}
                  </span>
                </span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
