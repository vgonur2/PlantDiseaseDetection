export default function Navbar() {
  return (
    <header className="w-full border-b border-leaf-200/60 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf-100">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5 text-leaf-700"
            aria-hidden="true"
          >
            <path
              d="M12 2C8 6 4 8 4 13c0 3.3 2.7 6 6 6 1.5 0 2.9-.6 4-1.5 1.1.9 2.5 1.5 4 1.5 3.3 0 6-2.7 6-6 0-5-4-7-8-11z"
              fill="currentColor"
              opacity="0.25"
            />
            <path
              d="M12 2v17c1.1-.9 2.5-1.5 4-1.5 3.3 0 6-2.7 6-6 0-5-4-7-10-9.5z"
              fill="currentColor"
            />
            <path
              d="M12 2C8 6 4 8 4 13c0 1.5.5 2.9 1.4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="text-xl font-semibold tracking-tight text-leaf-900">
          LeafGuard
        </span>
      </div>
    </header>
  );
}
