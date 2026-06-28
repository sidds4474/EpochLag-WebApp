"use client";

import { useAuth } from "../../../lib/auth/AuthProvider";

export default function HomePage() {
  const { user, signOut } = useAuth();

  return (
    <main className="min-h-screen bg-warm-cream flex items-center justify-center px-[24px]">
      <div className="w-full max-w-[480px] text-center">
        <h1 className="font-ivy font-bold text-primary-blue text-[36px] md:text-[44px] leading-[110%]">
          You&apos;re in.
        </h1>
        <p className="mt-[20px] font-montserrat text-primary-blue text-[16px] leading-[160%] opacity-80">
          Signed in as{" "}
          <span className="font-semibold">
            {user?.firstName} {user?.lastName}
          </span>{" "}
          ({user?.email}).
        </p>
        <p className="mt-[8px] font-montserrat text-primary-blue/60 text-[13px]">
          This is a placeholder. The real home/feed screen lands here next.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="cursor-pointer mt-[28px] bg-primary-orange text-primary-white font-montserrat font-semibold text-[14px] px-[28px] py-[12px] rounded-full hover:opacity-90 transition-opacity"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
