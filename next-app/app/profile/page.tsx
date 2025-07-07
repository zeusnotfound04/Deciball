"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(1, "Username is required"),
  pfp: z.any().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [pfpPreview, setPfpPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      username: "",
    },
  });

  const pfp = watch("pfp");

  useEffect(() => {
    if (session?.user) {
      setValue("name", session.user.name || "");
      setValue("username", session.user.username || "");
      setPfpPreview(session.user.pfpUrl || null);
    }
  }, [session, setValue]);

  useEffect(() => {
    if (pfp && pfp[0]) {
      const file = pfp[0];
      setPfpPreview(URL.createObjectURL(file));
    }
  }, [pfp]);

  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);

    try {
      let pfpUrl = session?.user?.pfpUrl || null;

      if (data.pfp && data.pfp[0]) {
        const formData = new FormData();
        formData.append("files", data.pfp[0]);
        const res = await fetch("/api/pfpUpload", {
          method: "POST",
          body: formData,
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "PFP upload failed");
        }
        pfpUrl = result.fileUrls[0];
      }

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, username: data.username, image: pfpUrl }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Profile update failed");
      }

      await update({ ...session, user: { ...session?.user, name: data.name, username: data.username, image: pfpUrl } });

      toast.success("Profile updated successfully!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto bg-card p-8 rounded-lg shadow-lg"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Edit Profile</h1>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col items-center mb-6">
            <Avatar className="w-24 h-24 mb-4">
              <AvatarImage src={pfpPreview || "/default-pfp.png"} alt="Profile picture" />
              <AvatarFallback>{watch("name")?.charAt(0)}</AvatarFallback>
            </Avatar>
            <Input id="pfp" type="file" {...register("pfp")} className="w-full" />
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...register("name")}
                className="w-full"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                {...register("username")}
                className="w-full"
              />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>}
            </div>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full mt-6">
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
