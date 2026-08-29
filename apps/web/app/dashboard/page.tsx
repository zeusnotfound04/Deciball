
"use client"

import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion } from "framer-motion"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form"
import { Input } from "@/app/components/ui/input"
import { Loader2, Music, Users, Headphones } from "lucide-react"
import DarkGradientBackground from "@/components/Background"
import axios from "axios"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useState } from "react"
import useRedirect from "@/hooks/useRedirect"

const formSchema = z.object({
  spaceName: z.string().min(1, "Space name is required").max(50, "Space name must be less than 50 characters")
});

export default function Page() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isCreating, setIsCreating] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      spaceName: ""
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsCreating(true)

      const response = await axios.post("/api/spaces", values)
      const spaceId = response.data.space.id;

      toast.success("Space created successfully!")
      router.push(`/space/${spaceId}`)

    } catch (error: any) {
      console.error("Form submission error", error);
      const errorMessage = error.response?.data?.message || "Failed to create space. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsCreating(false)
    }
  }

  if (!session || !session.user) {
    return (
      <DarkGradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif italic text-[32px] text-paper-white mb-4">Please Sign In</h1>
            <p className="font-satoshi text-[17px] text-steel-gray">You need to be signed in to create a space.</p>
          </div>
        </div>
      </DarkGradientBackground>
    );
  }

  return (
    <DarkGradientBackground>
      <div className="min-h-screen py-8">
        <div className="mx-auto px-4 sm:px-6 max-w-page">
          {/* Header */}
          <div className="text-center mb-16">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-serif italic text-[48px] sm:text-[64px] leading-[1] tracking-[-0.04em] text-paper-white mb-4"
            >
              Create Your Music Space
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-satoshi text-[17px] text-steel-gray"
            >
              Set up a collaborative music space where you can listen together with friends
            </motion.p>
          </div>

          {/* Feature cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-3 gap-4 mb-16"
          >
            {[
              { icon: Music, label: "Shared Playlists", desc: "Create collaborative playlists with your friends in real-time" },
              { icon: Users, label: "Live Chat", desc: "Chat with friends while discovering new music together" },
              { icon: Headphones, label: "Synchronized Listening", desc: "Listen to music in perfect sync with all participants" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-midnight-surface border border-graphite rounded-cards p-6 text-center">
                <Icon className="w-10 h-10 text-electric-cyan mx-auto mb-4" />
                <h3 className="font-serif italic text-xl text-paper-white mb-2">{label}</h3>
                <p className="font-satoshi text-sm text-steel-gray">{desc}</p>
              </div>
            ))}
          </motion.div>

          {/* Create space form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-midnight-surface border border-graphite rounded-cards p-8">
              <h2 className="font-serif italic text-[32px] text-paper-white text-center mb-6">Name Your Space</h2>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="spaceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs tracking-[0.02em] uppercase text-steel-gray">
                          Space Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Chill Vibes, Study Music, Weekend Party"
                            className="bg-graphite text-paper-white border-graphite h-12 text-[17px] font-satoshi rounded-lg focus:ring-1 focus:ring-electric-cyan/30 focus:border-slate-custom placeholder:text-steel-gray"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="font-satoshi text-sm text-steel-gray">
                          Choose a name that represents the vibe of your music space
                        </FormDescription>
                        <FormMessage className="font-mono text-xs text-red-400" />
                      </FormItem>
                    )}
                  />

                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full font-mono text-sm bg-graphite text-paper-white h-12 rounded-full hover:bg-charcoal disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating Space...
                      </>
                    ) : (
                      <>
                        <Music className="w-4 h-4" />
                        Create Space
                      </>
                    )}
                  </button>
                </form>
              </Form>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center mt-8 font-mono text-xs text-steel-gray"
          >
            Once created, you can invite friends by sharing the space link
          </motion.p>
        </div>
      </div>
    </DarkGradientBackground>
  )
}
