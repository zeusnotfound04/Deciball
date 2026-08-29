"use client";

import DarkGradientBackground from '@/components/Background';
import AuthCard from '@/components/ui/AuthCard';
import { useSearchParams } from 'next/navigation';
import React, { Suspense } from 'react';
import Loader from '@/components/ui/Loader';

const SignInContent = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <DarkGradientBackground>
      <div className="min-h-screen bg-void-black flex items-center justify-center p-4">
        <AuthCard
          title="Welcome Back"
          description="Sign in to continue your music journey"
          callbackURL={callbackUrl}
          className="w-full max-w-md"
        />
      </div>
    </DarkGradientBackground>
  );
};

const SignInCard = () => {
  return (
    <Suspense fallback={
      <DarkGradientBackground>
        <div className="min-h-screen bg-void-black flex items-center justify-center p-4">
          <Loader label="Loading" />
        </div>
      </DarkGradientBackground>
    }>
      <SignInContent />
    </Suspense>
  );
};

export default SignInCard;
