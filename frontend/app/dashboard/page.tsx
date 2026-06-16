"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) {
      router.replace("/login");
      return;
    }
    if (sesion.rol === "maestro") {
      router.replace("/maestro/grupos");
    } else {
      router.replace("/alumno/portafolio");
    }
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-ink/40">Redirigiendo...</p>
    </main>
  );
}
