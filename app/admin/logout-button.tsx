"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.refresh();
      }}
      className="px-3 py-1 rounded border-2 border-terminal_green/50 hover:border-terminal_green text-sm font-bold"
    >
      LOG OUT
    </button>
  );
}
