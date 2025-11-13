import React, { createContext, useState, useContext, type ReactNode } from 'react';

// Define the shape of the user object
interface User {
  id: string;
  email: string;
  // Add other user properties as needed
}

// Define the shape of the session object
interface Session {
  user: User;
  access_token: string;
  refresh_token: string;
}

// Define the shape of the context
interface UserContextType {
  session: Session | null;
  login: (sessionData: Session) => void;
  logout: () => void;
}

// Create the context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Create the provider component
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(() => {
    // Attempt to load session from localStorage on initial load
    const savedSession = localStorage.getItem('session');
    return savedSession ? JSON.parse(savedSession) : null;
  });

  const login = (sessionData: Session) => {
    setSession(sessionData);
    // Save session to localStorage to persist session
    localStorage.setItem('session', JSON.stringify(sessionData));
    console.log('User ID:', sessionData.user.id);
  };

  const logout = () => {
    setSession(null);
    // Remove session from localStorage
    localStorage.removeItem('session');
  };

  return (
    <UserContext.Provider value={{ session, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
