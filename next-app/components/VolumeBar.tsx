import React, { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "framer-motion";
import { Volume } from "lucide-react";
import { LessVolumeIcon, MoreVolumeIcon } from "./icons";
import { useAudio } from "@/store/audioStore";

const MAX_OVERFLOW = 50;

interface ElasticSliderProps {
  defaultValue?: number;
  startingValue?: number;
  maxValue?: number;
  className?: string;
  isStepped?: boolean;
  stepSize?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VolumeBar: React.FC<ElasticSliderProps> = ({
  defaultValue = 50,
  startingValue = 0,
  maxValue = 100,
  className = "",
  isStepped = false,
  stepSize = 1,
  leftIcon = <LessVolumeIcon className="w-3 h-3" />,
  rightIcon = <MoreVolumeIcon className="w-3 h-3" />,
}) => {
  const { volume, setVolume, mute, unmute, isMuted } = useAudio();
  
  const currentVolumeValue = Math.round(volume * 100);

  const handleVolumeChange = (newValue: number) => {
    const normalizedVolume = newValue / 100;
    setVolume(normalizedVolume, true); // Save to localStorage
    
    if (normalizedVolume > 0 && isMuted) {
      unmute();
    }
  };

  const handleLeftIconClick = () => {
    if (isMuted) {
      unmute();
    } else {
      mute();
    }
  };

  const handleRightIconClick = () => {
    setVolume(1, true); // Save to localStorage
    if (isMuted) {
      unmute();
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 ${className}`}
    >
      <Slider
        defaultValue={currentVolumeValue}
        startingValue={startingValue}
        maxValue={maxValue}
        isStepped={isStepped}
        stepSize={stepSize}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
        onValueChange={handleVolumeChange}
        onLeftIconClick={handleLeftIconClick}
        onRightIconClick={handleRightIconClick}
        currentValue={currentVolumeValue}
        isMuted={isMuted}
      />
    </div>
  );
};

interface SliderProps {
  defaultValue: number;
  startingValue: number;
  maxValue: number;
  isStepped: boolean;
  stepSize: number;
  leftIcon: React.ReactNode;
  rightIcon: React.ReactNode;
  onValueChange?: (value: number) => void;
  onLeftIconClick?: () => void;
  onRightIconClick?: () => void;
  currentValue?: number;
  isMuted?: boolean;
}

const Slider: React.FC<SliderProps> = ({
  defaultValue,
  startingValue,
  maxValue,
  isStepped,
  stepSize,
  leftIcon,
  rightIcon,
  onValueChange,
  onLeftIconClick,
  onRightIconClick,
  currentValue,
  isMuted = false,
}) => {
  const [value, setValue] = useState<number>(currentValue || defaultValue);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState<"left" | "middle" | "right">("middle");
  const clientX = useMotionValue(0);
  const overflow = useMotionValue(0);
  const scale = useMotionValue(1);

  useEffect(() => {
    if (currentValue !== undefined) {
      setValue(currentValue);
    }
  }, [currentValue]);

  useEffect(() => {
    if (currentValue === undefined) {
      setValue(defaultValue);
    }
  }, [defaultValue]);

  useMotionValueEvent(clientX, "change", (latest: number) => {
    if (sliderRef.current) {
      const { left, right } = sliderRef.current.getBoundingClientRect();
      let newValue: number;
      if (latest < left) {
        setRegion("left");
        newValue = left - latest;
      } else if (latest > right) {
        setRegion("right");
        newValue = latest - right;
      } else {
        setRegion("middle");
        newValue = 0;
      }
      overflow.jump(decay(newValue, MAX_OVERFLOW));
    }
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons > 0 && sliderRef.current) {
      const { left, width } = sliderRef.current.getBoundingClientRect();
      let newValue =
        startingValue +
        ((e.clientX - left) / width) * (maxValue - startingValue);
      if (isStepped) {
        newValue = Math.round(newValue / stepSize) * stepSize;
      }
      newValue = Math.min(Math.max(newValue, startingValue), maxValue);
      setValue(newValue);
      
      if (onValueChange) {
        onValueChange(newValue);
      }
      
      clientX.jump(e.clientX);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    handlePointerMove(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Handle direct click on slider track
  const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (sliderRef.current && e.target === e.currentTarget) {
      const { left, width } = sliderRef.current.getBoundingClientRect();
      let newValue =
        startingValue +
        ((e.clientX - left) / width) * (maxValue - startingValue);
      if (isStepped) {
        newValue = Math.round(newValue / stepSize) * stepSize;
      }
      newValue = Math.min(Math.max(newValue, startingValue), maxValue);
      setValue(newValue);
      
      if (onValueChange) {
        onValueChange(newValue);
      }
    }
  };

  const handlePointerUp = () => {
    animate(overflow, 0, { type: "spring", bounce: 0.5 });
  };

  const getRangePercentage = (): number => {
    const totalRange = maxValue - startingValue;
    if (totalRange === 0) return 0;
    return ((value - startingValue) / totalRange) * 100;
  };

  return (
    <>
      <motion.div
        onHoverStart={() => animate(scale, 1.1)}
        onHoverEnd={() => animate(scale, 1)}
        onTouchStart={() => animate(scale, 1.1)}
        onTouchEnd={() => animate(scale, 1)}
        style={{
          scale,
          opacity: useTransform(scale, [1, 1.1], [0.8, 1]),
        }}
        className="flex w-full touch-none select-none items-center justify-center gap-3"
      >
        <motion.div
          animate={{
            scale: region === "left" ? [1, 1.02, 1] : 1,
            transition: { duration: 0.25 },
          }}
          style={{
            x: useTransform(() =>
              region === "left" ? -overflow.get() / scale.get() : 0
            ),
          }}
          onClick={onLeftIconClick}
          className="cursor-pointer transition-colors hover:text-white flex-shrink-0"
        >
          {leftIcon}
        </motion.div>

        <div
          ref={sliderRef}
          className="relative flex w-full max-w-32 flex-grow cursor-grab touch-none select-none items-center py-2"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onClick={handleSliderClick}
        >
          <motion.div
            style={{
              scaleX: useTransform(() => {
                if (sliderRef.current) {
                  const { width } = sliderRef.current.getBoundingClientRect();
                  const overflowScale = 1 + overflow.get() / width;
                  return Math.min(overflowScale, 1.3);
                }
                return 1;
              }),
              scaleY: useTransform(overflow, [0, MAX_OVERFLOW], [1, 0.9]),
              transformOrigin: useTransform(() => {
                if (sliderRef.current) {
                  const { left, width } =
                    sliderRef.current.getBoundingClientRect();
                  return clientX.get() < left + width / 2 ? "right" : "left";
                }
                return "center";
              }),
              height: useTransform(scale, [1, 1.1], [4, 8]),
              marginTop: useTransform(scale, [1, 1.1], [0, -2]),
              marginBottom: useTransform(scale, [1, 1.1], [0, -2]),
            }}
            className="flex flex-grow"
          >
            <div className="relative h-full flex-grow overflow-hidden rounded-full bg-gray-600">
              <div
                className={`absolute h-full rounded-full transition-colors duration-200 ${
                  isMuted ? 'bg-red-500' : 'bg-gray-300'
                }`}
                style={{ width: `${getRangePercentage()}%` }}
              />
            </div>
          </motion.div>
        </div>

        <motion.div
          animate={{
            scale: region === "right" ? [1, 1.05, 1] : 1,
            transition: { duration: 0.25 },
          }}
          style={{
            x: useTransform(() =>
              region === "right" ? overflow.get() / scale.get() : 0
            ),
          }}
          onClick={onRightIconClick}
          className="cursor-pointer transition-colors hover:text-white flex-shrink-0"
        >
          {rightIcon}
        </motion.div>
      </motion.div>
      <p className={`absolute text-xs font-medium tracking-wide transform -translate-y-6 transition-colors duration-200 ${
        isMuted ? 'text-red-400' : 'text-gray-400'
      }`}>
        {isMuted ? 'Muted' : Math.round(value)}
      </p>
    </>
  );
};

function decay(value: number, max: number): number {
  if (max === 0) {
    return 0;
  }
  const entry = value / max;
  const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5);
  return sigmoid * max;
}

export default VolumeBar;
