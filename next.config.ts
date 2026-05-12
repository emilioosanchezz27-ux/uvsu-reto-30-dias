import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exponer explícitamente las variables de entorno al bundle del cliente.
  // Esto garantiza que estén disponibles independientemente de cómo
  // Turbopack maneje el reemplazo estático de process.env.NEXT_PUBLIC_*.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? 'U vs U',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? '',
  },
};

// Log en build para verificar que Vercel tiene las vars
console.log('[next.config] SUPABASE_URL presente:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('[next.config] SUPABASE_KEY presente:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default nextConfig;
