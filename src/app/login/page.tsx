import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="font-display text-xl font-extrabold uppercase leading-none tracking-wide text-antara">
            Antara
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-ink/40">Tiendita</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
