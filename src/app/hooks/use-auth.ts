
"use client";

import { useContext } from "react";
import { AuthContext } from "@/contexts/auth-context";

// This custom hook provides a convenient way to access the authentication context.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This error is thrown if the hook is used outside of an AuthProvider,
    // which helps catch setup issues early.
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
