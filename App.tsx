import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileVideo, AlertCircle, CheckCircle2 } from 'lucide-react';
import VideoCanvas, { VideoCanvasHandle } from './components/VideoCanvas';
import Controls from './components/Controls';
import { extractAudioFromVideo, downloadBlob } from './services/media';
import { transcribeAudio } from './services/geminiService';
import { SubtitleChunk, StyleConfig, ProcessingStatus } from './types';
import { DEFAULT_STYLE } from './constants';

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [subtitles, setSubtitles] = useState<SubtitleChunk[]>([]);
  const [styleConfig, setStyleConfig] = useState<StyleConfig>(DEFAULT_STYLE);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<VideoCanvasHandle>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) { // 50MB limit for demo sanity
        setError("File too large. Please upload a video under 50MB.");
        return;
    }

    setVideoFile(file);
    setVideoSrc(URL.createObjectURL(file));
    setSubtitles([]);
    setError(null);
    setStatus('extracting_audio');

    try {
      // 1. Extract Audio
      const base64Audio = await extractAudioFromVideo(file);
      
      // 2. Transcribe
      setStatus('transcribing');
      const chunks = await transcribeAudio(base64Audio);
      setSubtitles(chunks);
      
      setStatus('ready');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process video. Check API Key or file format.");
      setStatus('idle');
    }
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    
    setStatus('exporting');
    setIsPlaying(true); // Force play for recording
    
    try {
      canvasRef.current.startRecording();
      
      // Wait for video to end (handled by onVideoEnd in VideoCanvas) or manual stop
      // For this demo, we'll rely on the user seeing it play through.
      // But to automate, we can listen for onVideoEnd.
      
    } catch (e) {
      console.error(e);
      setStatus('ready');
      setIsPlaying(false);
    }
  };

  // Called when video finishes playing
  const handleVideoEnd = async () => {
    if (status === 'exporting' && canvasRef.current) {
        setIsPlaying(false);
        const { blob, extension } = await canvasRef.current.stopRecording();
        downloadBlob(blob, `shorts-baker-${Date.now()}.${extension}`);
        setStatus('ready');
    } else {
        setIsPlaying(false);
    }
  };

  const handleSplitSubtitle = (id: string, cursorIndex: number) => {
    const index = subtitles.findIndex(s => s.id === id);
    if (index === -1) return;
    
    const sub = subtitles[index];
    
    // Safety checks
    if (cursorIndex <= 0 || cursorIndex >= sub.text.length) return;

    const text1 = sub.text.substring(0, cursorIndex).trim();
    const text2 = sub.text.substring(cursorIndex).trim();
    
    if (!text1 || !text2) return; // Don't split if one side is empty

    const totalDuration = sub.end - sub.start;
    const splitRatio = cursorIndex / sub.text.length;
    const splitTime = sub.start + (totalDuration * splitRatio);

    const newSub1: SubtitleChunk = {
        ...sub,
        text: text1,
        end: splitTime
    };

    const newSub2: SubtitleChunk = {
        id: `sub-${Date.now()}-split`,
        text: text2,
        start: splitTime,
        end: sub.end
    };

    const newSubtitles = [...subtitles];
    newSubtitles.splice(index, 1, newSub1, newSub2);
    setSubtitles(newSubtitles);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      
      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left: Video Preview Area */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-4 lg:p-8 bg-[#0f172a]">
          {!videoFile ? (
            <div className="max-w-md w-full p-8 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/50 text-center hover:border-purple-500 transition-colors">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2 font-['Montserrat']">Upload Video</h2>
              <p className="text-slate-400 mb-6 text-sm">Select a short video file (mp4, webm) to generate captions.</p>
              
              <label className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold cursor-pointer transition-transform hover:scale-105">
                Choose File
                <input 
                  type="file" 
                  accept="video/*" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
              </label>

              {status === 'idle' && !error && (
                <p className="mt-4 text-xs text-slate-500">Max 50MB. AI Transcription included.</p>
              )}
            </div>
          ) : (
            <div className="relative w-full h-full max-w-[400px] aspect-[9/16] shadow-2xl rounded-xl overflow-hidden ring-1 ring-slate-700">
               <VideoCanvas
                 ref={canvasRef}
                 videoSrc={videoSrc}
                 subtitles={subtitles}
                 styleConfig={styleConfig}
                 isPlaying={isPlaying}
                 currentTime={currentTime}
                 onTimeUpdate={setCurrentTime}
                 onDurationChange={setDuration}
                 onVideoEnd={handleVideoEnd}
               />
               
               {/* Status Overlay */}
               {(status === 'extracting_audio' || status === 'transcribing') && (
                 <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                   <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                   <p className="font-bold text-lg animate-pulse">
                     {status === 'extracting_audio' ? 'Extracting Audio...' : 'AI Generating Captions...'}
                   </p>
                 </div>
               )}

                {/* Exporting Overlay */}
                {status === 'exporting' && (
                 <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-2 z-20 shadow-lg">
                   <div className="w-2 h-2 bg-white rounded-full"></div>
                   RECORDING
                 </div>
               )}
            </div>
          )}
          
          {error && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500 text-red-200 px-4 py-2 rounded-lg flex items-center gap-2 max-w-md">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError(null)} className="ml-2 hover:text-white">&times;</button>
            </div>
          )}
        </div>

        {/* Right: Sidebar Controls */}
        {videoFile && (
            <Controls 
              styleConfig={styleConfig}
              setStyleConfig={setStyleConfig}
              subtitles={subtitles}
              setSubtitles={setSubtitles}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onSeek={(t) => {
                setCurrentTime(t);
                canvasRef.current?.seek(t);
              }}
              onSplit={handleSplitSubtitle}
              status={status}
              onExport={handleExport}
            />
        )}
      </div>
    </div>
  );
};

export default App;