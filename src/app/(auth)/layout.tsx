import { Home, Package, Wallet, Target } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background md:flex">
      <div
        className="flex flex-col justify-between rounded-b-[30px] px-6 py-8 md:w-1/2 md:rounded-none md:justify-center md:px-16 md:py-0"
        style={{ backgroundImage: "var(--band-gradient)" }}
      >
        <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-foreground md:hidden">
          <Home className="size-5" />
        </span>

        <div className="md:max-w-md">
          <span className="hidden size-11 items-center justify-center rounded-2xl bg-white text-foreground md:mb-8 md:flex">
            <Home className="size-5" />
          </span>
          <h1 className="font-heading text-3xl leading-tight text-foreground md:text-5xl">Everything at home, in one place.</h1>
          <p className="mt-3 text-sm text-foreground/80 md:mt-5 md:text-base">
            Where things are kept, what expires this week, who paid for what, and what you are saving towards — shared with the people you live with.
          </p>

          <div className="mt-6 hidden flex-col gap-3 md:flex">
            <Bullet icon={<Package className="size-4" />} label="34 items filed to a room and a place" />
            <Bullet icon={<Wallet className="size-4" />} label="₹18,420 tracked and split this month" />
            <Bullet icon={<Target className="size-4" />} label="Four goals funded together" />
          </div>
        </div>

        <p className="hidden text-xs text-foreground/70 md:block">My Space</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10 md:px-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

function Bullet({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-foreground/85">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/40">{icon}</span>
      {label}
    </div>
  );
}
