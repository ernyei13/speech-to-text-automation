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
  stopRecording: () => Promise<{ blob: Blob; extension: string }>;
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
  const requestRef = useRef<number | null>(null);
  const recordingMimeTypeRef = useRef<string>('');

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

  const getSupportedMimeType = () => {
    const types = [
        'video/mp4', 
        'video/webm;codecs=h264', 
        'video/webm;codecs=vp9', 
        'video/webm'
    ];
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  // Seek handler exposed to parent
  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        drawFrame(); 
      }
    },
    startRecording: () => {
      if (!canvasRef.current || !videoRef.current) return;
      
      // Reset video to start
      videoRef.current.currentTime = 0;
      videoRef.current.play(); 

      const stream = canvasRef.current.captureStream(30); // 30 FPS
      
      // Add audio track
      let finalStream = stream;
      try {
        // @ts-ignore
        const videoStream = videoRef.current.captureStream ? videoRef.current.captureStream() : videoRef.current.mozCaptureStream();
        const audioTracks = videoStream.getAudioTracks();
        if (audioTracks.length > 0) {
           finalStream.addTrack(audioTracks[0]);
        }
      } catch (e) {
        console.warn("Could not capture audio", e);
      }

      const mimeType = getSupportedMimeType();
      recordingMimeTypeRef.current = mimeType;
      
      if (!mimeType) {
          console.error("No supported MediaRecorder mimeType found.");
          return;
      }

      const recorder = new MediaRecorder(finalStream, { mimeType });
      
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
          resolve({ blob: new Blob(), extension: 'webm' });
          return;
        }

        mediaRecorderRef.current.onstop = () => {
          const mimeType = recordingMimeTypeRef.current;
          const blob = new Blob(chunksRef.current, { type: mimeType });
          
          let extension = 'webm';
          if (mimeType.includes('mp4')) extension = 'mp4';
          
          resolve({ blob, extension });
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

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      if (video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const { timingOffset } = styleConfig;
    const currentSub = subtitles.find(s => 
      video.currentTime >= (s.start + timingOffset) && video.currentTime <= (s.end + timingOffset)
    );

    if (currentSub) {
      drawText(ctx, currentSub, video.currentTime, canvas.width, canvas.height);
    }

    if (!video.paused && !video.ended) {
      onTimeUpdate(video.currentTime);
      requestRef.current = requestAnimationFrame(drawFrame);
    }
  };

  // Easing functions
  const easeOutBack = (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  const easeOutBounce = (x: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (x < 1 / d1) {
      return n1 * x * x;
    } else if (x < 2 / d1) {
      return n1 * (x -= 1.5 / d1) * x + 0.75;
    } else if (x < 2.5 / d1) {
      return n1 * (x -= 2.25 / d1) * x + 0.9375;
    } else {
      return n1 * (x -= 2.625 / d1) * x + 0.984375;
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
      fontFamily, fontSize, color, highlightColor, strokeColor, 
      strokeWidth, yOffset, animation, shadow, uppercase, timingOffset, animationSpeed 
    } = styleConfig;

    const scale = width / 1080; 
    const finalFontSize = fontSize * scale * 2.5; 
    const finalStrokeWidth = strokeWidth * scale;

    ctx.font = `900 ${finalFontSize}px "${fontFamily}"`;
    ctx.textBaseline = 'middle';
    
    const rawText = uppercase ? sub.text.toUpperCase() : sub.text;
    const words = rawText.split(' ');
    
    let totalTextWidth = 0;
    const wordWidths: number[] = [];
    const spaceWidth = ctx.measureText(' ').width;

    words.forEach(word => {
      const w = ctx.measureText(word).width;
      wordWidths.push(w);
      totalTextWidth += w;
    });
    totalTextWidth += (words.length - 1) * spaceWidth;

    const duration = sub.end - sub.start;
    const timePerWord = duration / words.length;
    
    const effectiveStart = sub.start + timingOffset;
    const elapsed = time - effectiveStart;
    
    const activeWordIndex = Math.min(Math.floor(elapsed / timePerWord), words.length - 1);

    let currentX = (width - totalTextWidth) / 2;
    const y = (yOffset / 100) * height;

    // --- Global Entry Animation Calculations ---
    let containerScale = 1;
    let containerAlpha = 1;
    let containerY = 0;

    if (animation === AnimationStyle.POP) {
      const popDuration = 0.2 / animationSpeed;
      const localT = Math.min(elapsed / popDuration, 1);
      containerScale = localT < 1 && localT > 0 ? easeOutBack(localT) : 1;
      if (localT <= 0) containerScale = 0; 

    } else if (animation === AnimationStyle.SLIDE_UP) {
      const slideDuration = 0.2 / animationSpeed;
      const localT = Math.min(elapsed / slideDuration, 1);
      containerAlpha = Math.max(0, localT);
      containerY = (1 - easeOutBack(localT)) * 50 * scale; 

    } else if (animation === AnimationStyle.FADE) {
      const fadeDuration = 0.3 / animationSpeed;
      const localT = Math.min(elapsed / fadeDuration, 1);
      containerAlpha = localT;

    } else if (animation === AnimationStyle.BOUNCE) {
      const bounceDuration = 0.5 / animationSpeed;
      const localT = Math.min(elapsed / bounceDuration, 1);
      containerY = (1 - easeOutBounce(localT)) * -100 * scale;
      containerAlpha = localT > 0 ? 1 : 0;
    }

    ctx.save();
    
    // Apply Global Transformations (Centered)
    const centerX = width / 2;
    ctx.translate(centerX, y + containerY);
    ctx.scale(containerScale, containerScale);
    ctx.translate(-centerX, -(y + containerY));
    ctx.globalAlpha = containerAlpha;

    // --- Draw Words ---
    words.forEach((word, index) => {
        // "Word Print" Logic: Hide future words completely
        if (animation === AnimationStyle.WORD_PRINT && index > activeWordIndex) {
            currentX += wordWidths[index] + spaceWidth;
            return;
        }

        const isHighlight = index === activeWordIndex;
        
        ctx.save();
        
        let wordScale = 1;
        
        // Active Word Pop Effect (Applied to all animations for style)
        if (isHighlight) {
            // Calculate a mini pop for the word when it becomes active
            const wordElapsed = elapsed - (index * timePerWord);
            const popDuration = 0.15;
            const t = Math.min(Math.max(wordElapsed / popDuration, 0), 1);
            
            // Pop up to 1.2 then back to 1.1 (sustained highlight size)
            // Or just sustain 1.1x while active
            wordScale = 1.1 + (Math.sin(t * Math.PI) * 0.1); 
            
            // For WORD_PRINT, emphasize the entry more
            if (animation === AnimationStyle.WORD_PRINT) {
               wordScale = easeOutBack(t);
            }
        } else {
            // In Word Print, past words can settle back to 1
            wordScale = 1;
        }

        // Apply Word-Level Transforms
        // We pivot around the center of the specific word
        const wordCenterX = currentX + (wordWidths[index] / 2);
        const wordCenterY = y;
        
        ctx.translate(wordCenterX, wordCenterY);
        ctx.scale(wordScale, wordScale);
        ctx.translate(-wordCenterX, -wordCenterY);

        if (shadow) {
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 8 * scale;
            ctx.shadowOffsetX = 4 * scale;
            ctx.shadowOffsetY = 4 * scale;
        }

        if (strokeWidth > 0) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = finalStrokeWidth;
            ctx.lineJoin = 'round';
            ctx.strokeText(word, currentX, y);
        }

        ctx.fillStyle = isHighlight ? highlightColor : color;
        // Remove shadow for fill to keep text crisp
        ctx.shadowColor = 'transparent'; 
        ctx.fillText(word, currentX, y);
        
        ctx.restore();

        currentX += wordWidths[index] + spaceWidth;
    });

    ctx.restore();
  };

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
        crossOrigin="anonymous" 
      />
      <canvas 
        ref={canvasRef} 
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
});

export default VideoCanvas;