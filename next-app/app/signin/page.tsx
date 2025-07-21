"use client";

import BeamsBackground from '@/components/Background';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import React, { Suspense } from 'react';

const SignInContent = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", { callbackUrl });
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <BeamsBackground>
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-gray-900 bg-opacity-90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 transform hover:scale-105 transition-all duration-500 ease-out border border-gray-800 hover:border-gray-700">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-50 animate-pulse"></div>

            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="mb-4 transform hover:rotate-12 transition-transform duration-300">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 animate-fade-in">Welcome Back</h2>
                <p className="text-gray-400 animate-fade-in-delay">Sign in to continue your journey</p>
              </div>

              <button
                onClick={handleGoogleSignIn}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 ease-out hover:shadow-2xl active:scale-95 flex items-center justify-center space-x-3 group mb-4"
              >
                <svg className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-lg">Continue with Google</span>
              </button>

              <div className="mt-8 text-center">
                <p className="text-gray-500 text-sm">
                  By signing in, you agree to our{" "}
                  <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
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
