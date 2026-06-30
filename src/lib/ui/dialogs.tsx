'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  AlertDialog,
  AlertDialogProps,
  ConfirmDialog,
  ConfirmDialogProps,
} from '@/components/ui/Dialog';

/**
 * Imperative dialog system (Task 4).
 *
 * Wrap your app in <DialogProvider>, then use the `useDialogs()` hook to
 * await user confirmation without dropping back to native window.confirm.
 *
 *   const { confirm, alert } = useDialogs();
 *   const ok = await confirm({ title: 'Delete?', variant: 'danger', confirmLabel: 'Delete' });
 *   if (ok) await deleteThing();
 */

type ConfirmOptions = Omit<
  ConfirmDialogProps,
  'isOpen' | 'onConfirm' | 'onCancel' | 'loading'
>;

type AlertOptions = Omit<AlertDialogProps, 'isOpen' | 'onClose'>;

interface DialogsContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: AlertOptions) => Promise<void>;
}

const DialogsContext = createContext<DialogsContextValue | null>(null);

export const useDialogs = (): DialogsContextValue => {
  const ctx = useContext(DialogsContext);
  if (!ctx) {
    throw new Error('useDialogs must be used within <DialogProvider>');
  }
  return ctx;
};

type ConfirmState =
  | (ConfirmOptions & {
      open: true;
      resolve: (value: boolean) => void;
    })
  | { open: false };

type AlertState =
  | (AlertOptions & {
      open: true;
      resolve: () => void;
    })
  | { open: false };

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
  });
  const [alertState, setAlertState] = useState<AlertState>({ open: false });

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...opts, open: true, resolve });
    });
  }, []);

  const alert = useCallback((opts: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setAlertState({ ...opts, open: true, resolve });
    });
  }, []);

  const closeConfirm = (result: boolean) => {
    if (confirmState.open) confirmState.resolve(result);
    setConfirmState({ open: false });
  };
  const closeAlert = () => {
    if (alertState.open) alertState.resolve();
    setAlertState({ open: false });
  };

  return (
    <DialogsContext.Provider value={{ confirm, alert }}>
      {children}
      <ConfirmDialog
        isOpen={confirmState.open}
        title={confirmState.open ? confirmState.title : ''}
        description={confirmState.open ? confirmState.description : undefined}
        confirmLabel={
          confirmState.open ? confirmState.confirmLabel ?? 'Confirm' : 'Confirm'
        }
        cancelLabel={
          confirmState.open ? confirmState.cancelLabel ?? 'Cancel' : 'Cancel'
        }
        variant={confirmState.open ? confirmState.variant ?? 'default' : 'default'}
        onConfirm={() => closeConfirm(true)}
        onCancel={() => closeConfirm(false)}
      />
      <AlertDialog
        isOpen={alertState.open}
        title={alertState.open ? alertState.title : ''}
        description={alertState.open ? alertState.description : undefined}
        buttonLabel={alertState.open ? alertState.buttonLabel ?? 'OK' : 'OK'}
        onClose={closeAlert}
      />
    </DialogsContext.Provider>
  );
};
