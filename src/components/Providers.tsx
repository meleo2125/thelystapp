'use client';

import React from 'react';
import { AuthProvider } from '@/backend/AuthContext';
import { Toaster } from 'react-hot-toast';
import { DialogProvider } from '@/lib/ui/dialogs';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Root client providers. Order matters:
 *   - AuthProvider must wrap everything since hooks like useDialogs
 *     are likely called from authed flows.
 *   - DialogProvider hosts the singleton confirm / alert dialogs (Task 4)
 *     and replaces window.confirm / window.alert globally.
 */
const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <DialogProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--secondary)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
            },
          }}
        />
        {children}
      </DialogProvider>
    </AuthProvider>
  );
};

export default Providers;
