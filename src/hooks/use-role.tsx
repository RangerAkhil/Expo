import React, { createContext, useContext, useState, ReactNode } from "react";

export type Role = "organizer" | "user" | "demo";

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  isOrganizer: boolean;
  isUser: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("demo");

  const isOrganizer = role === "organizer" || role === "demo";
  const isUser = role === "user" || role === "demo";

  return (
    <RoleContext.Provider value={{ role, setRole, isOrganizer, isUser }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
