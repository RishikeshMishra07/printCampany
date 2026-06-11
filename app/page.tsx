import React from 'react';
import LoginForm from '@/components/LoginForm';

export default function Home() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6">
      {/* Full-width background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/auto_manufacturing_bg.png"
          alt="AutoPrint Workshop"
          className="h-full w-full object-cover brightness-[0.4] dark:brightness-[0.3]"
        />
        {/* Overlay subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/30" />
      </div>

      {/* Floating Glassmorphism Container */}
      <div className="relative z-10 flex w-full max-w-5xl flex-col lg:flex-row overflow-hidden rounded-2xl sm:rounded-3xl bg-background/90 lg:bg-background/80 backdrop-blur-xl shadow-2xl border border-white/10 dark:border-white/5 min-h-[500px] lg:min-h-[550px]">
        
        {/* Left Form Side */}
        <div className="flex w-full flex-col justify-center p-6 sm:p-10 lg:p-12 lg:w-1/2 order-2 lg:order-1">
          <LoginForm />
        </div>

        {/* Right Branding Side */}
        <div className="flex w-full lg:w-1/2 flex-col items-center justify-center border-b lg:border-b-0 lg:border-l border-white/10 dark:border-white/5 p-8 lg:p-12 text-center select-none bg-black/60 lg:bg-black/80 backdrop-blur-md order-1 lg:order-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-4 lg:mb-6 h-16 w-16 lg:h-20 lg:w-20 text-blue-400 drop-shadow-lg"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
            AutoPrint
            <br />
            <span className="text-blue-400 font-light">Workshop</span>
          </h2>
          <p className="mt-3 lg:mt-4 text-blue-100/80 max-w-sm text-xs sm:text-sm">
            Advanced manufacturing dashboard for automotive part production, quality control, and logistics tracking.
          </p>
        </div>
      </div>
    </div>
  );
}
