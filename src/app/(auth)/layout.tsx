import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-xl font-semibold tracking-tight">
        <img src="/logo-icon.svg" alt="" className="size-9" />
        My Space
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
