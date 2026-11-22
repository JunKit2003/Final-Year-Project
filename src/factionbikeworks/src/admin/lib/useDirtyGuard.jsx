// Stop accidental loss of unsaved edits: in-app navigation asks "Leave without saving?",
// and closing or reloading the tab triggers the browser's own prompt.
import { useEffect } from "react";
import { useBlocker } from "react-router";
import { ConfirmDialog } from "../ui/overlay";

export function useDirtyGuard(dirty) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty) return undefined;
    const onUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);
  return blocker;
}

/** Render once per guarded screen: <DirtyPrompt blocker={useDirtyGuard(dirty)} /> */
export function DirtyPrompt({ blocker }) {
  if (blocker.state !== "blocked") return null;
  return (
    <ConfirmDialog
      title="Leave without saving?"
      confirmLabel="Leave"
      cancelLabel="Stay"
      tone="danger"
      onConfirm={() => blocker.proceed()}
      onCancel={() => blocker.reset()}
    >
      Your changes on this page haven&apos;t been saved.
    </ConfirmDialog>
  );
}
