"use client";

import { buttonVariants } from "./ui/button";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for things that can't be undone. */
  danger?: boolean;
};

type Ask = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask | null>(null);

/**
 * "Are you sure?" in the site's own style, instead of the browser's popup.
 * A native modal <dialog>: focus stays inside it, and Escape cancels.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const finish = useCallback((ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    dialogRef.current?.close();
    setOptions(null);
  }, []);

  const ask = useCallback<Ask>((next) => {
    // A second question answers the first with "no".
    resolveRef.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (options && dialog && !dialog.open) dialog.showModal();
  }, [options]);

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <dialog
        ref={dialogRef}
        className="confirm-dialog"
        aria-labelledby="confirm-title"
        onCancel={(e) => {
          e.preventDefault();
          finish(false);
        }}
        onClick={(e) => {
          // A click on the backdrop (outside the box) cancels.
          if (e.target === dialogRef.current) finish(false);
        }}
      >
        {options ? (
          <form
            method="dialog"
            className="space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              finish(true);
            }}
          >
            <h2 id="confirm-title" className="text-lg font-semibold text-foreground">
              {options.title}
            </h2>
            {options.body ? (
              <div className="text-sm text-muted-foreground">{options.body}</div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={buttonVariants({ variant: "outline" })}
                autoFocus
                onClick={() => finish(false)}
              >
                {options.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="submit"
                className={buttonVariants({
                  variant: options.danger ? "destructive" : "default",
                })}
              >
                {options.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </ConfirmContext.Provider>
  );
}

/** `await confirm({ title, … })` is true when they confirm. */
export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error("useConfirm needs a ConfirmProvider");
  return ask;
}
