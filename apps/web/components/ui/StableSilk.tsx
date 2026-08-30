"use client";

import React, { memo } from "react";
import dynamic from "next/dynamic";
import type { SilkProps } from "./SlickBackground";

const Silk = dynamic(() => import("./SlickBackground"), { ssr: false });

const StableSilk = memo(
  function StableSilk(props: SilkProps) {
    return <Silk {...props} />;
  },
  () => true
);

export default StableSilk;
