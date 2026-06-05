import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-5xl font-bold text-muted">404</p>
      <p className="text-sm text-muted">This page doesn&apos;t exist.</p>
      <Link
        href="/"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg"
      >
        Back to Daily HQ
      </Link>
    </div>
  );
}
