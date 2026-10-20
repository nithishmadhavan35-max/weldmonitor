import React, { createContext, useContext } from 'react';

const ThemeContext = createContext();

// White-only theme — no dark mode switcher
export const ThemeProvider = ({ children }) => {
  return (
    <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
