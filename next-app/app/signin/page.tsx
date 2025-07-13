"use client";

import BeamsBackground from '@/components/Background';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import React from 'react';

const SignInCard = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", { callbackUrl });
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  const handleSpotifySignIn = async () => {
    try {
      await signIn("spotify", { callbackUrl });
    } catch (error) {
      console.error("Spotify sign-in error:", error);
    }
  };

  return (
    <BeamsBackground>
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-gray-900 bg-opacity-90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 transform hover:scale-105 transition-all duration-500 ease-out border border-gray-800 hover:border-gray-700">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-50 animate-pulse"></div>

            <div className="relative z-10">
              {/* Header */}
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

              {/* Google Sign-in */}
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

              {/* Spotify Sign-in */}
              <button
                onClick={handleSpotifySignIn}
                className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 ease-out hover:shadow-2xl active:scale-95 flex items-center justify-center space-x-3 group"
              >
                <svg className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" viewBox="0 0 168 168">
                  <path
                    fill="#FFFFFF"
                    d="M84,0C37.67,0,0,37.67,0,84s37.67,84,84,84s84-37.67,84-84S130.33,0,84,0z M122.91,120.15
                    c-1.61,2.65-5.04,3.5-7.68,1.89c-20.99-12.73-47.47-15.63-78.73-8.63c-3.03,0.7-6.07-1.18-6.77-4.21
                    c-0.7-3.03,1.18-6.07,4.21-6.77c34.8-8.06,65.28-4.59,89.78,10.28C123.66,114.09,124.52,117.51,122.91,120.15z M134.28,97.3
                    c-2.02,3.23-6.28,4.27-9.51,2.25c-24.08-15.07-60.88-19.51-89.4-10.78c-3.59,1.1-7.38-0.88-8.48-4.47
                    c-1.1-3.59,0.88-7.38,4.47-8.48c33.84-10.37,75.09-5.45,103.95,12.07C135.26,90.03,136.3,94.27,134.28,97.3z M135.59,74.34
                    c-28.17-17.06-74.84-18.63-101.49-10.29c-4.11,1.27-8.48-1.03-9.74-5.14c-1.27-4.11,1.03-8.48,5.14-9.74
                    c30.99-9.55,83.25-7.72,115.97,12.34c3.65,2.21,4.82,6.94,2.61,10.59C145.87,75.38,141.24,76.55,135.59,74.34z"
                  />
                </svg>
                <span className="text-lg">Continue with Spotify</span>
              </button>

              {/* Footer */}
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

export default SignInCard;
