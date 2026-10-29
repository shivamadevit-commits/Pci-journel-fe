'use client';

import { useState } from 'react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoadingButton } from '@/components/shared/loading-button';

interface Props {
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<unknown> | unknown;
  disabled?: boolean;
}

/** Wraps any trigger element; the dialog stays open while the action runs and closes on success. */
export function ConfirmDialog({ trigger, title, description, confirmLabel = 'Confirm', destructive, onConfirm, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      /* the caller surfaces the error (toast); keep the dialog open so nothing is lost */
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <span onClick={() => !disabled && setOpen(true)} className="contents">
        {trigger}
      </span>
      <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <LoadingButton variant={destructive ? 'destructive' : 'default'} loading={busy} onClick={run}>
              {confirmLabel}
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
