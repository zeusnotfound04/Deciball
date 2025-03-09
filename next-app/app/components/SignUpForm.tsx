"use client";
import React, { useState } from "react";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { z } from "zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { cn } from "@/app/lib/utils";

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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-darkBlue-900 to-darkBlue-800">
      <div className="max-w-md w-full mx-auto rounded-xl p-6 md:p-8 shadow-lg bg-darkBlue-800/80 backdrop-blur-sm border border-darkBlue-700/50 text-white">
        <div className="text-center mb-6">
          <h2 className="font-bold text-2xl text-white bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Welcome to Decibal</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto my-3 rounded-full"></div>
          <p className="text-gray-300 text-sm max-w-sm mt-2">
            Login to Decibal if you can because we don&apos;t have a login flow yet
          </p>
        </div>
        
        <form className="my-6 space-y-5" onSubmit={handleSubmit}>
          <LabelInputContainer>
            <Label htmlFor="username" className="text-gray-200 font-medium">Username</Label>
            <div className="relative">
              <Input
                id="username"
                placeholder="Zeus"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
                className="bg-darkBlue-700/50 text-gray-100 border-darkBlue-600 h-11 pl-4 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
              />
            </div>
          </LabelInputContainer>
          
          <LabelInputContainer>
            <Label htmlFor="email" className="text-gray-200 font-medium">Email Address</Label>
            <div className="relative">
              <Input
                id="email"
                placeholder="kaiser@zeusnotfound.tech"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-darkBlue-700/50 text-gray-100 border-darkBlue-600 h-11 pl-4 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
              />
            </div>
          </LabelInputContainer>
          
          <LabelInputContainer>
            <Label htmlFor="password" className="text-gray-200 font-medium">Password</Label>
            <div className="relative">
              <Input
                id="password"
                placeholder="••••••••"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="bg-darkBlue-700/50 text-gray-100 border-darkBlue-600 h-11 pl-4 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
              />
            </div>
          </LabelInputContainer>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          <button
            className="bg-gradient-to-r from-blue-500 to-purple-600 block w-full text-white rounded-lg h-12 font-medium mt-6 shadow-md hover:shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
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
              "Sign up →"
            )}
          </button>
          
          <div className="text-center mt-6">
            <p className="text-gray-400 text-sm">
              Already have an account? <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">Log in</a>
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