"use client";
import React, { use, useState } from "react";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/app/lib/utils";
import {z} from "zod"
import axios from "axios"
import {useRouter} from "next/navigation"

const SignupSchema = z.object({
    streamId: z.string().min(3, "Username must be at least 3 characters long"),
 
});

export function UpVotForm() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    streamId: "",
    
  })

  const handleChange = (e : React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value})
  }

  const [loading , setLoading] = useState(false)  
  const [error , setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("")
    setLoading(true)
    
    const validation = SignupSchema.safeParse(formData);

    if(!validation.success){
      setError(validation.error.errors[0].message)
      setLoading(false)
      return
    }
    try {
      const response = await axios.post("/api/streams/upvote", formData)
      console.log(response.data)
      router.push("/")

    } catch (error : any) {
      console.log(error)
      setLoading(false)
      
    } finally {
      setLoading(false)
    }
  };
  return (
    <div className="flex items-center justify-center min-h-screen bg-void-black">
      <div className="max-w-md w-full mx-auto rounded-none md:rounded-cards p-4 md:p-8 shadow-input bg-midnight-surface">
        <h2 className="font-serif font-bold text-xl text-paper-white">
          Upvote Your Stream
        </h2>
        

        <form className="my-8" onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mb-4">
            <LabelInputContainer>
              <Label htmlFor="username">Stream Id</Label>
              <Input 
                id="streamId"
                placeholder="id"
                type="text"
                value={formData.streamId}
                onChange={handleChange}

                />
            </LabelInputContainer>
          </div>
         

          {error && <span className="text-red-500 text-sm mb-4">{error}</span>}

          <button
            className="relative group/btn bg-graphite block w-full text-paper-white rounded-md h-10 font-medium border border-graphite hover:bg-charcoal transition-colors"
            type="submit"
          >
            {loading ? "Up Voting..." : "Up Vote →"}
          
            <BottomGradient />
          </button>

          <div className="bg-graphite my-8 h-[1px] w-full" />
        </form>
      </div>
    </div>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-electric-cyan" />
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-electric-cyan/50" />
    </>
  );
};

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
