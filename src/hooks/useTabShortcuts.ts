import { useEffect, useCallback } from 'react';

interface UseTabShortcutsProps {
  tabs: Array<{ id: string; toolId: string; label: string }>;
  selectedTabIndex: number;
  onTabChange: (index: number) => void;
  onCloseTab: (index: number) => void;
}

export const useTabShortcuts = ({
  tabs,
  selectedTabIndex,
  onTabChange,
  onCloseTab,
}: UseTabShortcutsProps) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only handle shortcuts if Ctrl/Cmd is pressed
      if (!event.ctrlKey && !event.metaKey) return;

      switch (event.key.toLowerCase()) {
        case 'tab':
          event.preventDefault(); // Prevent default tab behavior
          if (event.shiftKey) {
            // Ctrl+Shift+Tab: Previous tab
            const newIndex = selectedTabIndex > 0 ? selectedTabIndex - 1 : tabs.length - 1;
            onTabChange(newIndex);
          } else {
            // Ctrl+Tab: Next tab
            const newIndex = selectedTabIndex < tabs.length - 1 ? selectedTabIndex + 1 : 0;
            onTabChange(newIndex);
          }
          break;

        case 'w':
          event.preventDefault(); // Prevent default browser close behavior
          // Ctrl+W: Close current tab
          if (tabs.length > 1) {
            onCloseTab(selectedTabIndex);
          }
          break;
      }
    },
    [tabs, selectedTabIndex, onTabChange, onCloseTab]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}; 