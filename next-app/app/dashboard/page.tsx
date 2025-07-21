
"use client"

import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion } from "framer-motion"
import { Button } from "@/app/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form"
import { Input } from "@/app/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Loader2, Music, Users, Headphones } from "lucide-react"
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
      console.log(values);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-zinc-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please Sign In</h1>
          <p className="text-zinc-400">You need to be signed in to create a space.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent mb-4"
          >
            Create Your Music Space
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 text-lg"
          >
            Set up a collaborative music room where you can listen together with friends
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          <Card className="bg-zinc-900/80 border-zinc-800 text-center">
            <CardHeader>
              <Music className="w-12 h-12 text-cyan-400 mx-auto mb-2" />
              <CardTitle className="text-white">Shared Playlists</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-sm">Create collaborative playlists with your friends in real-time</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800 text-center">
            <CardHeader>
              <Users className="w-12 h-12 text-teal-400 mx-auto mb-2" />
              <CardTitle className="text-white">Live Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-sm">Chat with friends while discovering new music together</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-zinc-800 text-center">
            <CardHeader>
              <Headphones className="w-12 h-12 text-purple-400 mx-auto mb-2" />
              <CardTitle className="text-white">Synchronized Listening</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-sm">Listen to music in perfect sync with all participants</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-center text-2xl">Name Your Space</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="spaceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-zinc-300 text-lg">Space Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Chill Vibes, Study Music, Weekend Party"
                            className="bg-zinc-800/50 text-zinc-200 border-zinc-700 h-12 text-lg focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-zinc-400">
                          Choose a name that represents the vibe of your music space
                        </FormDescription>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    disabled={isCreating}
                    className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white h-12 text-lg font-medium transition-all duration-300 shadow-lg shadow-cyan-900/30"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Creating Space...
                      </>
                    ) : (
                      <>
                        <Music className="w-5 h-5 mr-2" />
                        Create Space
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8"
        >
          <p className="text-zinc-500 text-sm">
            Once created, you can invite friends by sharing the space link
          </p>
        </motion.div>
      </div>
    </div>
  )
}