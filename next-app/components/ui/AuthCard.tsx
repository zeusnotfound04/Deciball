'use client';

import { Button } from '@/app/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { spaceGrotesk } from '@/lib/font';

type AuthProvider = 'google';

type AuthIconProps = React.ComponentProps<'svg'>;

interface SignInButtonProps {
  title: string;
  provider: AuthProvider;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  callbackURL?: string;
  icon: React.ReactNode;
}

interface AuthCardProps {
  title?: string;
  description?: string;
  callbackURL?: string;
  className?: string;
}

/**
 * Authentication provider icons
 */
const AuthIcons = {
  Google: (props: AuthIconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" {...props}>
      <path
        fill="currentColor"
        d="M 25.996094 48 C 13.3125 48 2.992188 37.683594 2.992188 25 C 2.992188 12.316406 13.3125 2 25.996094 2 C 31.742188 2 37.242188 4.128906 41.488281 7.996094 L 42.261719 8.703125 L 34.675781 16.289063 L 33.972656 15.6875 C 31.746094 13.78125 28.914063 12.730469 25.996094 12.730469 C 19.230469 12.730469 13.722656 18.234375 13.722656 25 C 13.722656 31.765625 19.230469 37.269531 25.996094 37.269531 C 30.875 37.269531 34.730469 34.777344 36.546875 30.53125 L 24.996094 30.53125 L 24.996094 20.175781 L 47.546875 20.207031 L 47.714844 21 C 48.890625 26.582031 47.949219 34.792969 43.183594 40.667969 C 39.238281 45.53125 33.457031 48 25.996094 48 Z"
      ></path>
    </svg>
  ),
};

/**
 * Button component for social authentication providers using NextAuth
 */
const SignInButton = ({
  title,
  provider,
  loading,
  setLoading,
  callbackURL = '/',
  icon,
}: SignInButtonProps) => (
  <Button
    variant="outline"
    className={cn(
      'w-full py-3 gap-3 bg-white/5 backdrop-blur-sm border border-white/20 hover:bg-white/10',
      'transition-all duration-300 text-white hover:text-white text-base h-12 rounded-xl',
      'hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-400/20',
      spaceGrotesk.className
    )}
    disabled={loading}
    onClick={async () => {
      setLoading(true);
      try {
        await signIn(provider, { 
          callbackUrl: callbackURL,
          redirect: true 
        });
      } catch (error) {
        console.error('Sign in error:', error);
        setLoading(false);
      }
    }}
  >
    {loading ? (
      <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
    ) : (
      <div className="w-5 h-5 text-white">{icon}</div>
    )}
    <span className="font-medium">
      {loading ? 'Signing in...' : `Continue with ${title}`}
    </span>
  </Button>
);

/**
 * Standalone AuthCard component for sign-in pages
 */
export default function AuthCard({
  title = "Welcome to Deciball",
  description = "Sign in to create and join music spaces with your friends",
  callbackURL = "/",
  className,
}: AuthCardProps) {
  const [googleLoading, setGoogleLoading] = useState(false);

  return (
    <div className={cn(
      "flex items-center justify-center",
      className
    )}>
      <div className="w-full max-w-md bg-black/90 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
        <div className="text-center mb-8">
          <h2 className={cn(
            "text-2xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent mb-3",
            spaceGrotesk.className
          )}>
            {title}
          </h2>
          <p className={cn(
            "text-white/70 text-base leading-relaxed",
            spaceGrotesk.className
          )}>
            {description}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <SignInButton
            title="Google"
            provider="google"
            loading={googleLoading}
            setLoading={setGoogleLoading}
            callbackURL={callbackURL}
            icon={<AuthIcons.Google />}
          />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className={cn(
                "bg-black/90 px-4 text-white/50 font-medium",
                spaceGrotesk.className
              )}>
                Secure Sign In
              </span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className={cn(
            "text-xs text-white/50 leading-relaxed",
            spaceGrotesk.className
          )}>
            By continuing, you agree to our{' '}
            <Link
              href="/terms-of-service"
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy-policy"
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
