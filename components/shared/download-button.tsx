'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { downloadFile, errorMessage } from '@/lib/api-client';
import { LoadingButton } from '@/components/shared/loading-button';

/** Downloads through the authorised endpoint `GET /files/:id/download` (never a public URL). */
export function DownloadButton({ fileId, children = 'Download', variant = 'outline', size = 'sm', fallbackName }: { fileId: string; children?: React.ReactNode; variant?: 'outline' | 'ghost' | 'secondary' | 'default'; size?: 'sm' | 'default' | 'xs'; fallbackName?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <LoadingButton
      type="button"
      variant={variant}
      size={size}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadFile(`/files/${fileId}/download`, fallbackName);
        } catch (e) {
          toast.error(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      {!busy && <Download className="size-3.5" aria-hidden />}
      {children}
    </LoadingButton>
  );
}
