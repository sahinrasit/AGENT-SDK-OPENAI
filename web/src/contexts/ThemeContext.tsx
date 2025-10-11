import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const saved = localStorage.getItem('theme') as Theme;
    if (saved) return saved;

    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  });

  useEffect(() => {
    console.log('[ThemeContext] Theme changed to:', theme);

    // Update document class
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      console.log('[ThemeContext] Added "dark" class to root element');
    } else {
      root.classList.remove('dark');
      console.log('[ThemeContext] Removed "dark" class from root element');
    }

    // Save to localStorage
    localStorage.setItem('theme', theme);
    console.log('[ThemeContext] Saved theme to localStorage:', theme);
  }, [theme]);

  const toggleTheme = () => {
    console.log('[ThemeContext] toggleTheme called, current theme:', theme);
    setThemeState(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      console.log('[ThemeContext] Changing theme from', prev, 'to', newTheme);
      return newTheme;
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
