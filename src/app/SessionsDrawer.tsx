/**
 * SessionsDrawer — slide-up sheet showing the PreviousSessions list.
 * Used from Start screen and Results screen (Ticket 0269).
 */

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PreviousSessions } from "./PreviousSessions";

interface Props {
  /** Text for the trigger button. Default "Sessions". */
  triggerLabel?: string;
  /** Optional extra className on the trigger button. */
  triggerClassName?: string;
}

export function SessionsDrawer({ triggerLabel = "Sessions", triggerClassName = "" }: Props) {
  const [open, setOpen] = useState(false);

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
        className="w-full overflow-y-auto sm:max-w-xl"
        data-testid="sessions-drawer-content"
      >
        <SheetHeader className="mb-2">
          <SheetTitle>Previous Sessions</SheetTitle>
          <SheetDescription className="sr-only">
            Browse, export, and delete your saved sessions.
          </SheetDescription>
        </SheetHeader>
        {/* PreviousSessions manages its own state; close sheet after back navigation */}
        <PreviousSessions />
      </SheetContent>
    </Sheet>
  );
}
