// src/components/ui/checkbox.tsx
import * as React from "react";
import { cn } from "@/lib/utils"; // utility for classNames, adjust if not present
import { Check } from "lucide-react";

// Simple Shadcn-style Checkbox component
export const Checkbox = React.forwardRef<
    React.ElementRef<"input">,
    Omit<React.ComponentPropsWithoutRef<"input">, "onChange"> & {
        onCheckedChange?: (checked: boolean) => void;
        onChange?: React.ChangeEventHandler<HTMLInputElement>;
    }
>(({ className, onCheckedChange, onChange, ...props }, ref) => (
    <div className={cn("flex items-center space-x-2", className)}>
        <input
            type="checkbox"
            ref={ref}
            onChange={(e) => {
                onChange?.(e);
                onCheckedChange?.(e.target.checked);
            }}
            className={cn(
                "peer h-4 w-4 shrink-0 rounded border border-primary bg-background hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                props.checked && "bg-primary text-primary-foreground"
            )}
            {...props}
        />
        {props.checked && (
            <Check className="absolute left-0.5 top-0.5 h-3 w-3 text-white" />
        )}
    </div>
))

Checkbox.displayName = "Checkbox"

export default Checkbox;
