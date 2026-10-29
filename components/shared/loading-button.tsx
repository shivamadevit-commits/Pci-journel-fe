import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = React.ComponentProps<typeof Button> & { loading?: boolean; loadingText?: string };

/** Disables itself and shows a spinner while loading — prevents duplicate submissions. */
export function LoadingButton({ loading, loadingText, children, disabled, ...props }: Props) {
  return (
    <Button disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}
