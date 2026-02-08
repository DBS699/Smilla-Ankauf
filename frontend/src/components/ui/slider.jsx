import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ className, orientation = "horizontal", ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    orientation={orientation}
    className={cn(
      "slider-root relative flex touch-none select-none",
      className
    )}
    {...props}>
    <SliderPrimitive.Track className="slider-track relative grow overflow-hidden rounded-full bg-primary/20">
      <SliderPrimitive.Range className="slider-range absolute bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="slider-thumb block rounded-full border-2 border-primary bg-background shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
