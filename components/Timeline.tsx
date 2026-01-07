import React, { useRef, useState, useEffect } from 'react';
import { SubtitleChunk } from '../types';

interface TimelineProps {
  duration: number;
  currentTime: number;
  subtitles: SubtitleChunk[];
  waveformData?: number[];
  onSeek: (time: number) => void;
  onUpdateSubtitle: (id: string, start: number, end: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({ 
  duration, 
  currentTime, 
  subtitles, 
  waveformData,
  onSeek, 
  onUpdateSubtitle 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [dragging, setDragging] = useState<{
    id: string;
    action: 'move' | 'resize-left' | 'resize-right';
    initialX: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);

  const MIN_DURATION = 0.5;

  // Draw Waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData || waveformData.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Check if dimensions are valid to avoid 0 size error
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    
    const width = rect.width;
    const height = rect.height;
    const barWidth = width / waveformData.length;
    
    // Draw center line
    const centerY = height / 2;
    
    ctx.fillStyle = 'rgba(99, 102, 241, 0.3)'; // Indigo-500 with low opacity
    
    waveformData.forEach((val, index) => {
        const x = index * barWidth;
        const barHeight = Math.max(val * height * 0.8, 2); 
        // Draw centered bar
        ctx.fillRect(x, centerY - barHeight / 2, Math.max(barWidth, 0.5), barHeight);
    });

  }, [waveformData, duration]); // Redraw when data arrives or window resizes (simplified)

  const handleTrackClick = (e: React.MouseEvent) => {
    if (dragging) return;
    if (!containerRef.current || duration === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = Math.max(0, Math.min(duration, percentage * duration));
    onSeek(newTime);
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragging || !containerRef.current || duration === 0) return;
      e.preventDefault();

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragging.initialX;
      const deltaTime = (deltaX / rect.width) * duration;

      const sub = subtitles.find(s => s.id === dragging.id);
      if (!sub) return;

      let newStart = dragging.initialStart;
      let newEnd = dragging.initialEnd;

      if (dragging.action === 'move') {
        const subDuration = dragging.initialEnd - dragging.initialStart;
        newStart = Math.max(0, Math.min(duration - subDuration, dragging.initialStart + deltaTime));
        newEnd = newStart + subDuration;
      } else if (dragging.action === 'resize-left') {
        newStart = Math.max(0, Math.min(dragging.initialEnd - MIN_DURATION, dragging.initialStart + deltaTime));
      } else if (dragging.action === 'resize-right') {
        newEnd = Math.max(dragging.initialStart + MIN_DURATION, Math.min(duration, dragging.initialEnd + deltaTime));
      }

      onUpdateSubtitle(dragging.id, newStart, newEnd);
    };

    const handlePointerUp = () => {
      setDragging(null);
    };

    if (dragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, duration, subtitles, onUpdateSubtitle]);

  return (
    <div className="w-full h-full bg-[#1e293b] flex flex-col select-none relative shadow-inner">
      
      {/* Time Ruler */}
      <div className="h-8 w-full border-b border-slate-700 bg-slate-900 relative flex items-end px-4 text-[11px] text-slate-400 font-mono flex-shrink-0 z-20">
         <span>0:00</span>
         {[0.25, 0.5, 0.75].map(p => (
            <span key={p} className="absolute transform -translate-x-1/2" style={{ left: `${p * 100}%` }}>
                {duration > 0 ? (duration * p).toFixed(1) + 's' : ''}
            </span>
         ))}
         <span className="ml-auto">{duration > 0 ? duration.toFixed(1) + 's' : '0s'}</span>
      </div>

      {/* Tracks Container */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-crosshair group my-2 mx-4 bg-[#0f172a] rounded-lg border border-slate-700"
        onPointerDown={handleTrackClick}
      >
        {/* Waveform Visualization (Background) */}
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full pointer-events-none" 
        />

        {/* Playhead Line */}
        <div 
           className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)]"
           style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
        >
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500 transform -translate-x-[5.5px]" />
        </div>

        {/* Subtitles Overlay */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-16">
            {subtitles.map((sub) => {
            const left = (sub.start / (duration || 1)) * 100;
            const width = ((sub.end - sub.start) / (duration || 1)) * 100;
            const isActive = currentTime >= sub.start && currentTime <= sub.end;
            const isDraggingThis = dragging?.id === sub.id;

            return (
                <div
                key={sub.id}
                className={`absolute top-0 bottom-0 rounded-md border text-xs overflow-hidden flex items-center justify-center transition-all
                    ${isActive || isDraggingThis 
                        ? 'bg-purple-600/90 border-purple-400 z-20 shadow-lg scale-[1.02] text-white' 
                        : 'bg-slate-700/80 border-slate-600 z-10 hover:bg-slate-600/90 text-slate-200'}
                `}
                style={{ left: `${left}%`, width: `${width}%` }}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    setDragging({
                    id: sub.id,
                    action: 'move',
                    initialX: e.clientX,
                    initialStart: sub.start,
                    initialEnd: sub.end
                    });
                }}
                >
                {/* Left Handle */}
                <div 
                    className="absolute left-0 top-0 bottom-0 w-3 bg-white/10 hover:bg-white/40 cursor-w-resize z-30" 
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        setDragging({
                            id: sub.id,
                            action: 'resize-left',
                            initialX: e.clientX,
                            initialStart: sub.start,
                            initialEnd: sub.end
                        });
                    }}
                />
                
                {/* Text Label */}
                <span className="px-3 truncate font-bold pointer-events-none w-full text-center drop-shadow-md select-none">
                    {sub.text}
                </span>

                {/* Right Handle */}
                <div 
                    className="absolute right-0 top-0 bottom-0 w-3 bg-white/10 hover:bg-white/40 cursor-e-resize z-30"
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        setDragging({
                            id: sub.id,
                            action: 'resize-right',
                            initialX: e.clientX,
                            initialStart: sub.start,
                            initialEnd: sub.end
                        });
                    }}
                />
                </div>
            );
            })}
        </div>
      </div>
    </div>
  );
};

export default Timeline;