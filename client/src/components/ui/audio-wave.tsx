import { cn } from "@/lib/utils";

interface AudioWaveProps {
  visible: boolean;
  className?: string;
}

export function AudioWave({ visible, className }: AudioWaveProps) {
  if (!visible) return null;
  
  return (
    <div className={cn("audio-wave", className)}>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
}
