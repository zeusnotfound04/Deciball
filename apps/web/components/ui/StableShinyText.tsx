"use client";

import React, { memo } from "react";
import dynamic from "next/dynamic";

const ShinyText = dynamic(() => import("./ShinnyText"), { ssr: false });

const StableShinyText = memo(
  function StableShinyText(props: any) {
    return <ShinyText {...props} />;
  },
  () => true
);

export default StableShinyText;
