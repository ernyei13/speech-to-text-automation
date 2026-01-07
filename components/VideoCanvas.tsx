import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { StyleConfig, SubtitleChunk, AnimationStyle } from '../types';

interface VideoCanvasProps {
  videoSrc: string;
  subtitles: SubtitleChunk[];
  styleConfig: StyleConfig;
  isPlaying: boolean;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onVideoEnd: () => void;
}

export interface VideoCanvasHandle {
  seek: (time: number) => void;
  startRecording: () => void;
  stopRecording: () => Promise<Blob>;
}

const VideoCanvas = forwardRef<VideoCanvasHandle, VideoCanvasProps>(({
  videoSrc,
  subtitles,
  styleConfig,
  isPlaying,
  currentTime,
  onTimeUpdate,
  onDurationChange,
  onVideoEnd
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const requestRef = useRef<number>();

  // Initialize video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.src = videoSrc;
      videoRef.current.load();
    }
  }, [videoSrc]);

  // Handle Play/Pause
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(e => console.error("Play error", e));
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Seek handler exposed to parent
  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        // Force a redraw immediately
        drawFrame(); 
      }
    },
    startRecording: () => {
      if (!canvasRef.current || !videoRef.current) return;
      
      // Reset video to start
      videoRef.current.currentTime = 0;
      videoRef.current.play(); // Start playing to record

      const stream = canvasRef.current.captureStream(30); // 30 FPS
      
      // Add audio track from video to the stream
      // Note: captureStream might not include audio by default in some browsers unless configured
      // We need to use Web Audio API to mix if needed, but often captureStream works if video plays sound.
      // However, mute logic in app might interfere.
      // For robustness, we construct a MediaStream with video track from canvas and audio track from video element (captureStream)
      
      // Attempt to get audio track from video element
      let finalStream = stream;
      try {
        // @ts-ignore - mozCaptureStream/captureStream compatibility
        const videoStream = videoRef.current.captureStream ? videoRef.current.captureStream() : videoRef.current.mozCaptureStream();
        const audioTracks = videoStream.getAudioTracks();
        if (audioTracks.length > 0) {
           finalStream.addTrack(audioTracks[0]);
        }
      } catch (e) {
        console.warn("Could not capture audio from video element for recording", e);
      }

      const recorder = new MediaRecorder(finalStream, { mimeType: 'video/webm; codecs=vp9' });
      
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current = recorder;
      recorder.start();
    },
    stopRecording: () => {
      return new Promise((resolve) => {
        if (!mediaRecorderRef.current) {
          resolve(new Blob());
          return;
        }

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          resolve(blob);
        };
        mediaRecorderRef.current.stop();
        if(videoRef.current) videoRef.current.pause();
      });
    }
  }));

  // Drawing Loop
  const drawFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match video once metadata loaded
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      if (video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    }

    // 1. Draw Video Frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 2. Find Active Subtitle
    const currentSub = subtitles.find(s => 
      video.currentTime >= s.start && video.currentTime <= s.end
    );

    // 3. Draw Subtitle
    if (currentSub) {
      drawText(ctx, currentSub, video.currentTime, canvas.width, canvas.height);
    }

    if (!video.paused && !video.ended) {
      onTimeUpdate(video.currentTime);
      requestRef.current = requestAnimationFrame(drawFrame);
    }
  };

  const drawText = (
    ctx: CanvasRenderingContext2D, 
    sub: SubtitleChunk, 
    time: number, 
    width: number, 
    height: number
  ) => {
    const { 
      fontFamily, fontSize, color, strokeColor, 
      strokeWidth, yOffset, animation, shadow, uppercase 
    } = styleConfig;

    // Scaling factor (base on 1080p width to keep consistency)
    const scale = width / 1080; 
    const finalFontSize = fontSize * scale * 2.5; // Multiplier for visibility
    const finalStrokeWidth = strokeWidth * scale;

    ctx.font = `900 ${finalFontSize}px "${fontFamily}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let textToDraw = uppercase ? sub.text.toUpperCase() : sub.text;
    const x = width / 2;
    // Calculate Y based on percentage
    const y = (yOffset / 100) * height;

    // Animation Calculation
    let animScale = 1;
    let animAlpha = 1;
    let animY = 0;

    const progress = (time - sub.start) / (sub.end - sub.start);
    const easeOutBack = (t: number) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    if (animation === AnimationStyle.POP) {
      // Pop in effect (0 to 0.2s)
      const duration = 0.15;
      const localT = Math.min((time - sub.start) / duration, 1);
      animScale = localT < 1 ? easeOutBack(localT) : 1;
    } else if (animation === AnimationStyle.SLIDE_UP) {
      const duration = 0.2;
      const localT = Math.min((time - sub.start) / duration, 1);
      animAlpha = localT;
      animY = (1 - localT) * 50 * scale; // Slide from 50px down
    }

    ctx.save();
    ctx.translate(x, y + animY);
    ctx.scale(animScale, animScale);
    ctx.globalAlpha = animAlpha;

    // Shadow
    if (shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 10 * scale;
      ctx.shadowOffsetX = 4 * scale;
      ctx.shadowOffsetY = 4 * scale;
    }

    // Stroke
    if (strokeWidth > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = finalStrokeWidth;
      ctx.lineJoin = 'round';
      ctx.strokeText(textToDraw, 0, 0);
    }

    // Fill
    ctx.fillStyle = color;
    ctx.fillText(textToDraw, 0, 0);

    ctx.restore();
  };

  // Sync loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(drawFrame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  });

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden rounded-lg shadow-2xl">
      <video 
        ref={videoRef} 
        className="hidden" 
        muted={false} 
        onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
        onEnded={() => {
            onVideoEnd();
        }}
        playsInline
        crossOrigin="anonymous" // Important for canvas if using generic assets, though blobs are fine
      />
      <canvas 
        ref={canvasRef} 
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
});

export default VideoCanvas;
