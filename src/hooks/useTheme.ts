import { useState, useEffect, useCallback } from 'react';
import { updateMonacoTheme } from '../config/monaco';

type Theme = 'light' | 'dark';

// Create a custom event for theme changes
const THEME_CHANGE_EVENT = 'theme-change';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [currentTool, setCurrentTool] = useState<string>('');

  const updateTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: newTheme } }));
  }, []);

  const toggleTheme = useCallback(() => {
    updateTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, updateTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        updateTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [updateTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    currentTool,
    setCurrentTool
  };
};

// Export a function to listen for theme changes
export const onThemeChange = (callback: (theme: Theme) => void) => {
  const handler = (event: CustomEvent<{ theme: Theme }>) => {
    callback(event.detail.theme);
  };
  
  window.addEventListener(THEME_CHANGE_EVENT, handler as EventListener);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, handler as EventListener);
};
