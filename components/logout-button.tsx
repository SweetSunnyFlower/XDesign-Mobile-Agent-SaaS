"use client";

import { LogOutIcon } from "lucide-react";
import { signOut } from "next-auth/react"; 
import { toast } from "sonner";

export function LogoutButton() {
  async function handleLogout() {
    try {
      await signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to log out");
      console.error(error);
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2"
    >
      <LogOutIcon className="size-4" />
      Logout
    </button>
  );
}
