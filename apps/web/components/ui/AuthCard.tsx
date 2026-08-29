'use client';

import { Button } from '@/app/components/ui/button';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

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
    className="w-full py-3 gap-3 bg-graphite border border-slate-custom rounded-full font-mono text-sm text-paper-white h-12 transition-colors hover:bg-charcoal hover:border-steel-gray"
    disabled={loading}
    onClick={async () => {
      setLoading(true);
      try {
        await signIn(provider, {
          callbackUrl: callbackURL,
          redirect: true,
        });
      } catch (error) {
        console.error('Sign in error:', error);
        setLoading(false);
      }
    }}
  >
    {loading ? (
      <Loader2 className="w-5 h-5 animate-spin text-electric-cyan" />
    ) : (
      <div className="w-5 h-5 text-paper-white">{icon}</div>
    )}
    <span className="font-medium">
      {loading ? 'Signing in...' : `Continue with ${title}`}
    </span>
  </Button>
);

export default function AuthCard({
  title = 'Welcome to Deciball',
  description = 'Sign in to create and join music spaces with your friends',
  callbackURL = '/',
  className,
}: AuthCardProps) {
  const [googleLoading, setGoogleLoading] = useState(false);

  return (
    <div className={`flex items-center justify-center ${className ?? ''}`}>
      <div className="w-full max-w-md bg-midnight-surface border border-graphite rounded-cards p-8">
        <div className="text-center mb-8">
          <h2 className="font-serif italic text-[32px] text-paper-white mb-3">
            {title}
          </h2>
          <p className="font-satoshi text-steel-gray text-base leading-relaxed">
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
              <div className="w-full border-t border-graphite" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-midnight-surface px-4 font-mono text-[10px] tracking-[0.02em] uppercase text-steel-gray">
                Secure Sign In
              </span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="font-mono text-[10px] text-steel-gray leading-relaxed">
            By continuing, you agree to our{' '}
            <Link
              href="/terms-of-service"
              className="text-electric-cyan hover:text-sky-signal transition-colors"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy-policy"
              className="text-electric-cyan hover:text-sky-signal transition-colors"
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
