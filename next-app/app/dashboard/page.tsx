
"use client"
import {
  useState
} from "react"
import {
  toast
} from "sonner"
import {useForm} from "react-hook-form"
import {
  zodResolver
} from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  cn
} from "@/lib/utils"
import {
  Button
} from "@/app/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/components/ui/form"
import {
  Input
} from "@/app/components/ui/input"
import axios from "axios"
import { useRouter } from "next/navigation"

const formSchema = z.object({
  spaceName: z.string().min(1)
});

export default function Page() {
  const router = useRouter()
  const form = useForm < z.infer < typeof formSchema >> ({
    resolver: zodResolver(formSchema),

  })

  async function onSubmit(values: z.infer < typeof formSchema > ) {
    try {
      console.log(values);
      const response = await axios.post("/api/spaces" , values)
      const spaceId = response.data.space.id;

      router.push(`/dashboard/${spaceId}`)
      
      
    } catch (error) {
      console.error("Form submission error", error);
      toast.error("Failed to submit the form. Please try again.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl mx-auto py-10">
        
        <FormField
          control={form.control}
          name="spaceName"
          render={({ field  } : any) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input 
                placeholder="Space Name"

                type=""
                {...field} />
              </FormControl>
              <FormDescription>This is your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}