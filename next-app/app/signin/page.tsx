"use client";

import BeamsBackground from '@/components/Background';
import AuthCard from '@/components/ui/AuthCard';
import { useSearchParams } from 'next/navigation';
import React, { Suspense } from 'react';

const SignInContent = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <BeamsBackground>
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <AuthCard
          title="Welcome Back"
          description="Sign in to continue your music journey"
          callbackURL={callbackUrl}
          className="w-full max-w-md"
        />
      </div>
    </BeamsBackground>
  );
};

const SignInCard = () => {
  return (
    <Suspense fallback={
      <BeamsBackground>
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
          <div className="relative z-10 w-full max-w-md">
            <div className="bg-gray-900 bg-opacity-90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-gray-800">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-white mt-4">Loading...</p>
              </div>
            </div>
          </div>
        </div>
      </BeamsBackground>
    }>
      <SignInContent />
    </Suspense>
  );
};

export default SignInCard;
