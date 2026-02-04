// MIT License header from original repo
// Source: https://github.com/samhirtarif/react-audio-visualize/blob/master/src/LiveAudioVisualizer.tsx
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { type dataPoint } from "./types";
import { calculateLiveBarData, drawLive } from "./utils";
import * as utils from "./utils";
console.log("Utils exports:", utils);


export interface LiveAudioVisualizerProps {
  analyser: AnalyserNode|null;
  width?: number | string;
  height?: number | string;
  barWidth?: number;
  gap?: number;
  backgroundColor?: string;
  barColor?: string;
  style?: React.CSSProperties;
  
}

export const LiveAudioVisualizer = forwardRef<HTMLCanvasElement, LiveAudioVisualizerProps>(
  (
    {
      analyser,
      width = 500,
      height = 100,
      barWidth = 2,
      gap = 1,
      backgroundColor = "transparent",
      barColor = "rgb(160, 198, 255)",
      style,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);//the canvas element that will be used to display the audio visualizer
    const animationRef = useRef<number| null>(null);//the animation frame that will be used to update the audio visualizer
    useImperativeHandle(ref, () => canvasRef.current!);

    useEffect(() => {
      if (!canvasRef.current ) return;


      const render = () => {
        if (!canvasRef.current || !analyser ) return;
        const barsData: dataPoint[] = calculateLiveBarData(
            analyser,
           Number(height),
            Number(width),
             barWidth,
              gap);

        drawLive(
          barsData,
          canvasRef.current,
          barWidth,
          gap,
          backgroundColor,
          barColor
        );
        animationRef.current = requestAnimationFrame(render);//it will give a id for every frame that is rendered from the render function
      }; 
      animationRef.current = requestAnimationFrame(render);//

      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      
      };
    }, [analyser,height, width, barWidth, gap, backgroundColor, barColor]);

    return (
      <canvas
        ref={canvasRef}
        width={typeof width === "number" ? width : undefined}
        height={typeof height === "number" ? height : undefined}
        style={{ border: "1px solid black", ...style, width: typeof width === "string" ? width : undefined, height: typeof height === "string" ? height : undefined }}
      />
    );
  }
);

LiveAudioVisualizer.displayName = "LiveAudioVisualizer";
