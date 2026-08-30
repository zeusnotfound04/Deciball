"use client";

import React, { memo } from "react";
import dynamic from "next/dynamic";

const FuzzyText = dynamic(() => import("./FuzzyText"), { ssr: false });

const StableFuzzyText = memo(
  function StableFuzzyText(props: any) {
    return <FuzzyText {...props} />;
  },
  () => true
);

export default StableFuzzyText;
