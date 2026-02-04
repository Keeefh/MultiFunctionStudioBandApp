// Utility functions for LiveAudioVisualizer
// Derived from https://github.com/samhirtarif/react-audio-visualize/blob/master/src/utils.ts

import { dataPoint } from "./types";

export function calculateLiveBarData(
  analyser: AnalyserNode,
  height: number | undefined,
  width: number | undefined,
  barWidth: number,
  gap: number
): dataPoint[] {
  if (!height || !width) return [];
  const bufferLength = analyser.frequencyBinCount; //just saying how much frequences slot we have 
  const dataArray = new Uint8Array(bufferLength); //just making a easier  array of numbers to store the data
  analyser.getByteFrequencyData(dataArray); //get the data from the analyser and store it in the dataArray (pitch , loudness)

  const barCount = Math.floor((width as number) / (barWidth + gap));
  const bars: dataPoint[] = [];
  for (let i = 0; i < barCount; i++) {
    // Use linear mapping from frequency data to bar
    const barValue = dataArray[Math.floor((i / barCount) * bufferLength)];// to find the barValue based on the iteration of barcound and barvalue. 
    const magnitude = (barValue / 255) * height;
    bars.push({ max: magnitude, min: 0 });
  }
  return bars;
}

export function drawLive(
  bars: dataPoint[],
  canvas: HTMLCanvasElement,
  barWidth: number,
  gap: number,
  backgroundColor: string,
  barColor: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < bars.length; i++) {
    const { max } = bars[i];
    ctx.fillStyle = barColor;
    ctx.fillRect(i * (barWidth + gap), canvas.height - max, barWidth, max);
  }
  ctx.restore();//the restore method is used to restore the canvas to its original state
}

// Provide a default export that mirrors named exports to avoid runtime import errors
export default {
  calculateLiveBarData,
  drawLive,
};
