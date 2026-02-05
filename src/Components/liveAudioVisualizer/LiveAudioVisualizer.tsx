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
    const containerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => canvasRef.current!);

    // Update canvas resolution when container size changes (for responsive 100% sizing)
    useEffect(() => {
      if (!canvasRef.current || !containerRef.current) return;
      
      const updateCanvasSize = () => {
        if (!canvasRef.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && 
            (canvasRef.current.width !== Math.ceil(rect.width) || 
             canvasRef.current.height !== Math.ceil(rect.height))) {
          canvasRef.current.width = Math.ceil(rect.width);
          canvasRef.current.height = Math.ceil(rect.height);
        }
      };
      
      updateCanvasSize();
      const resizeObserver = new ResizeObserver(updateCanvasSize);
      resizeObserver.observe(containerRef.current);
      
      return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
      if (!canvasRef.current ) return;


      const render = () => {
        if (!canvasRef.current || !analyser ) return;
        // Use actual canvas dimensions for responsive sizing
        const canvasWidth = canvasRef.current.width;
        const canvasHeight = canvasRef.current.height;
        
        const barsData: dataPoint[] = calculateLiveBarData(
            analyser,
            canvasHeight,
            canvasWidth,
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
    }, [analyser, barWidth, gap, backgroundColor, barColor]);

    return (
      <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex' }}>
        <canvas
          ref={canvasRef}
          width={typeof width === "number" ? width : undefined}
          height={typeof height === "number" ? height : undefined}
          style={{ display: 'block', flex: 1, ...style, width: typeof width === "string" ? width : undefined, height: typeof height === "string" ? height : undefined }}
        />
      </div>
    );
  }
);

LiveAudioVisualizer.displayName = "LiveAudioVisualizer";
