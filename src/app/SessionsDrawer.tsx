/**
 * SessionsDrawer — slide-up sheet showing the PreviousSessions list.
 * Used from Start screen and Results screen (Ticket 0269).
 * 0275: Devtools toggle in footer.
 */

import { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { PreviousSessions } from "./PreviousSessions";
import { isDevToolsEnabled } from "./devtools";

interface Props {
  /** Text for the trigger button. Default "Sessions". */
  triggerLabel?: string;
  /** Optional extra className on the trigger button. */
  triggerClassName?: string;
}

export function SessionsDrawer({ triggerLabel = "Sessions", triggerClassName = "" }: Props) {
  const [open, setOpen] = useState(false);
  // 0275: Local state for devtools toggle, synced to localStorage
  const [devEnabled, setDevEnabled] = useState(() => isDevToolsEnabled());

  const handleDevToggle = useCallback((checked: boolean) => {
    try {
      if (checked) {
        localStorage.setItem("cm_devtools", "1");
      } else {
        localStorage.removeItem("cm_devtools");
      }
    } catch {
      // storage unavailable
    }
    setDevEnabled(checked);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          data-testid="sessions-drawer-trigger"
          className={`rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted ${triggerClassName}`}
        >
          {triggerLabel}
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-y-auto sm:max-w-xl"
        data-testid="sessions-drawer-content"
      >
        <SheetHeader className="mb-2">
          <SheetTitle>Previous Sessions</SheetTitle>
          <SheetDescription className="sr-only">
            Browse, export, and delete your saved sessions.
          </SheetDescription>
        </SheetHeader>

        {/* PreviousSessions manages its own state; close sheet after back navigation */}
        <div className="flex-1 overflow-y-auto">
          <PreviousSessions />
        </div>

        {/* 0275: Devtools footer toggle */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div>
            <span
              data-testid="devtools-toggle-label"
              className="text-xs font-medium text-muted-foreground"
            >
              Enable dev tools
            </span>
            <p className="text-[10px] text-muted-foreground">Dev tools are local-only.</p>
          </div>
          <Switch
            data-testid="devtools-toggle"
            checked={devEnabled}
            onCheckedChange={handleDevToggle}
            aria-label="Toggle dev tools"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
