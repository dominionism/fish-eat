"use client";

import { useEffect, useRef } from "react";
import { initGame } from "@/components/game";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { start, stop } = initGame(canvas);

    const loop = () => {
      start();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      stop();
    };
  }, []);

  return <canvas ref={canvasRef} id="game" width={900} height={550} />;
}
