"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { AppRole } from "@/lib/supabase/database.types";
const RoleContext=createContext<AppRole|null>(null);
export const useDocumentRole=()=>useContext(RoleContext);
export function DocumentRoleProvider({role,children}:{role:AppRole;children:ReactNode}) {return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;}
