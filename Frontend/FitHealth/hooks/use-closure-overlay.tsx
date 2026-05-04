import { useState, useCallback } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ClosureOverlay } from '@/components/closure-overlay';

export interface UseClosureOverlayOptions {
  duration?: number;
}

export function useClosureOverlay(options?: UseClosureOverlayOptions) {
  const colorScheme = useColorScheme() ?? 'light';
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState<string | undefined>();

  const show = useCallback((title: string, details?: string) => {
    setTitle(title);
    setDetails(details);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  const component = (
    <ClosureOverlay
      visible={visible}
      title={title}
      details={details}
      duration={options?.duration}
      onDismiss={hide}
      colorScheme={colorScheme}
    />
  );

  return { component, show, hide, visible };
}
