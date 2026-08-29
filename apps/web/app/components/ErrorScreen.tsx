import React, { PropsWithChildren } from "react";

export default function ErrorScreen({ children }: PropsWithChildren) {
  return (
    <div className="w-screen h-screen flex justify-center items-center bg-void-black text-ghost-gray">
      {children}
    </div>
  );
}