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
    <div className="flex items-center justify-center min-h-screen bg-darkBlue-900">
      <div className="max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-darkBlue-800 text-white">
        <h2 className="font-bold text-xl text-white">Welcome to Decibal</h2>
        <p className="text-gray-300 text-sm max-w-sm mt-2">
          Login to Decibal if you can because we don&apos;t have a login flow yet
        </p>
        <form className="my-8" onSubmit={handleSubmit}>
          <LabelInputContainer className="mb-4">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Zeus"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
              className="bg-darkBlue-700 text-white border-darkBlue-600"
            />
          </LabelInputContainer>
          <LabelInputContainer className="mb-4">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              placeholder="kaiser@zeusnotfound.tech"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="bg-darkBlue-700 text-white border-darkBlue-600"
            />
          </LabelInputContainer>
          <LabelInputContainer className="mb-4">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="••••••••"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="bg-darkBlue-700 text-white border-darkBlue-600"
            />
          </LabelInputContainer>

          {error && <span className="text-red-400 text-sm mb-4">{error}</span>}

          <button
            className="bg-darkBlue-700 hover:bg-darkBlue-600 block w-full text-white rounded-md h-10 font-medium"
            type="submit"
          >
            {loading ? "Signing up..." : "Sign up →"}
          </button>
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
