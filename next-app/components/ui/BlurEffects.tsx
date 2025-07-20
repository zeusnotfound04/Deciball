import { motion, Transition } from "framer-motion";
import { useEffect, useRef, useState, useMemo, ReactNode, Children, isValidElement, ElementType } from "react";

type BlurTextProps = {
  text?: string;
  children?: ReactNode;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters" | "components";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  animationFrom?: Record<string, string | number>;
  animationTo?: Array<Record<string, string | number>>;
  easing?: (t: number) => number;
  onAnimationComplete?: () => void;
  stepDuration?: number;
  as?: ElementType;
};

const buildKeyframes = (
  from: Record<string, string | number>,
  steps: Array<Record<string, string | number>>
): Record<string, Array<string | number>> => {
  const keys = new Set<string>([
    ...Object.keys(from),
    ...steps.flatMap((s) => Object.keys(s)),
  ]);

  const keyframes: Record<string, Array<string | number>> = {};
  keys.forEach((k) => {
    keyframes[k] = [from[k], ...steps.map((s) => s[k])];
  });
  return keyframes;
};

const BlurText: React.FC<BlurTextProps> = ({
  text = "",
  children,
  delay = 200,
  className = "",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  animationFrom,
  animationTo,
  easing = (t) => t,
  onAnimationComplete,
  stepDuration = 0.35,
  as: Component = "div",
}) => {
  // Determine what to animate
  let elements: (string | ReactNode)[] = [];
  
  if (children && animateBy === "components") {
    // If children are provided and animateBy is "components", animate each child
    elements = Children.toArray(children);
  } else if (text) {
    // If text is provided, split by words or letters
    elements = animateBy === "words" ? text.split(" ") : text.split("");
  } else if (children) {
    // If children are provided but not animateBy components, treat as single element
    elements = [children];
  }
  
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current as Element);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () =>
      direction === "top"
        ? { filter: "blur(10px)", opacity: 0, y: -50 }
        : { filter: "blur(10px)", opacity: 0, y: 50 },
    [direction]
  );

  const defaultTo = useMemo(
    () => [
      {
        filter: "blur(5px)",
        opacity: 0.5,
        y: direction === "top" ? 5 : -5,
      },
      { filter: "blur(0px)", opacity: 1, y: 0 },
    ],
    [direction]
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;

  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) =>
    stepCount === 1 ? 0 : i / (stepCount - 1)
  );

  return (
    <Component ref={ref} className={`blur-text ${className} flex flex-wrap`}>
      {elements.map((element, index) => {
        const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);

        const spanTransition: Transition = {
          duration: totalDuration,
          times,
          delay: (index * delay) / 1000,
        };
        (spanTransition as any).ease = easing;

        // Determine content to render
        let content: ReactNode;
        
        if (typeof element === "string") {
          // Handle text content
          content = element === " " ? "\u00A0" : element;
        } else if (isValidElement(element)) {
          // Handle React component
          content = element;
        } else {
          // Handle any other content
          content = element;
        }

        return (
          <motion.span
            key={index}
            initial={fromSnapshot}
            animate={inView ? animateKeyframes : fromSnapshot}
            transition={spanTransition}
            onAnimationComplete={
              index === elements.length - 1 ? onAnimationComplete : undefined
            }
            style={{
              display: "inline-block",
              willChange: "transform, filter, opacity",
            }}
          >
            {content}
            {typeof element === "string" && animateBy === "words" && index < elements.length - 1 && "\u00A0"}
          </motion.span>
        );
      })}
    </Component>
  );
};

// Additional component for easier component-based animations
type BlurComponentProps = Omit<BlurTextProps, 'text' | 'animateBy'> & {
  children: ReactNode;
};

const BlurComponent: React.FC<BlurComponentProps> = ({ children, ...props }) => {
  return (
    <BlurText animateBy="components" {...props}>
      {children}
    </BlurText>
  );
};

// Export both components and the default export for backward compatibility
export { BlurComponent };
export default BlurText;
