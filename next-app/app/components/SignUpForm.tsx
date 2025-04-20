"use client";
import React, { useState } from "react";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { z } from "zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { cn } from "@/app/lib/utils";
import Link from "next/link";

const SignupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export function SignupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const validation = SignupSchema.safeParse(formData);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      setLoading(false);
      return;
    }
    try {
      const response = await axios.post("/api/users", formData);
      console.log(response.data);
      router.push("/");
    } catch (error: any) {
      if (error.response && error.response.status === 400) {
        setError("User Already Exists");
      } else {
        setError("Something went wrong");
      }
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-black to-zinc-900">
      <div className="max-w-md w-full mx-auto rounded-xl p-6 md:p-8 shadow-2xl bg-zinc-900/90 backdrop-blur-md border border-zinc-800 text-white">
        <div className="text-center mb-6">
          <h2 className="font-bold text-2xl text-white bg-gradient-to-r from-cyan-400 to-teal-500 bg-clip-text text-transparent">Welcome to Decibal</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-cyan-400 to-teal-500 mx-auto my-3 rounded-full"></div>
          <p className="text-zinc-400 text-sm max-w-sm mt-2">
            Create your account to start exploring music together
          </p>
        </div>
        
        <form className="my-6 space-y-5" onSubmit={handleSubmit}>
          <LabelInputContainer>
            <Label htmlFor="username" className="text-zinc-300 font-medium">Username</Label>
            <div className="relative">
              <Input
                id="username"
                placeholder="Zeus"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
                className="bg-zinc-800/50 text-zinc-200 border-zinc-700 h-11 pl-4 rounded-lg focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all duration-200 placeholder:text-zinc-500"
              />
            </div>
          </LabelInputContainer>
          
          <LabelInputContainer>
            <Label htmlFor="email" className="text-zinc-300 font-medium">Email Address</Label>
            <div className="relative">
              <Input
                id="email"
                placeholder="kaiser@zeusnotfound.tech"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-zinc-800/50 text-zinc-200 border-zinc-700 h-11 pl-4 rounded-lg focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all duration-200 placeholder:text-zinc-500"
              />
            </div>
          </LabelInputContainer>
          
          <LabelInputContainer>
            <Label htmlFor="password" className="text-zinc-300 font-medium">Password</Label>
            <div className="relative">
              <Input
                id="password"
                placeholder="••••••••"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="bg-zinc-800/50 text-zinc-200 border-zinc-700 h-11 pl-4 rounded-lg focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all duration-200 placeholder:text-zinc-500"
              />
            </div>
          </LabelInputContainer>

          {error && (
            <div className="bg-red-900/20 border border-red-800/30 p-3 rounded-lg">
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          <button
            className="relative bg-gradient-to-r from-cyan-600 to-teal-600 block w-full text-white rounded-lg h-12 font-medium mt-6 shadow-lg shadow-cyan-900/30 hover:from-cyan-500 hover:to-teal-500 transition-all duration-300 overflow-hidden group"
            type="submit"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing up...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Sign up
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            )}
            <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          </button>
          
          <div className="text-center mt-8 border-t border-zinc-800 pt-6">
            <p className="text-zinc-400 text-sm">
              Already have an account? <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">Log in</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      {children}
    </div>
  );
};