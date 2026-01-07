import React, { useState } from 'react';
import { StyleConfig, SubtitleChunk, FontStyle, AnimationStyle, ProcessingStatus } from '../types';
import { FONTS, ANIMATIONS } from '../constants';
import { Play, Pause, Download, Wand2, Scissors, FastForward, Rewind } from 'lucide-react';

interface ControlsProps {
  styleConfig: StyleConfig;
  setStyleConfig: (config: StyleConfig) => void;
  subtitles: SubtitleChunk[];
  setSubtitles: (subs: SubtitleChunk[]) => void;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSplit: (id: string, cursorIndex: number) => void;
  status: ProcessingStatus;
  onExport: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  styleConfig,
  setStyleConfig,
  subtitles,
  setSubtitles,
  currentTime,
  duration,
  isPlaying,
  onTogglePlay,
  onSeek,
  onSplit,
  status,
  onExport
}) => {
  const activeSubIndex = subtitles.findIndex(s => currentTime >= s.start && currentTime <= s.end);
  const [cursorPos, setCursorPos] = useState<number | null>(null);

  const handleSubChange = (id: string, newText: string) => {
    setSubtitles(subtitles.map(s => s.id === id ? { ...s, text: newText } : s));
  };

  const handleTimeUpdate = (id: string, field: 'start' | 'end', value: number) => {
    setSubtitles(subtitles.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value));
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 w-full">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
        <h2 className="font-bold text-xl text-white flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-400" />
          Editor
        </h2>
        <button 
          onClick={onExport}
          disabled={status === 'exporting'}
          className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
            status === 'exporting' 
              ? 'bg-slate-600 cursor-not-allowed' 
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/30'
          }`}
        >
          <Download className="w-4 h-4" />
          {status === 'exporting' ? 'Baking...' : 'Export'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Style Controls */}
        <section className="space-y-4">
          <h3 className="text-sm uppercase tracking-wider text-slate-400 font-semibold">Style & Animation</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Font</label>
              <select 
                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-purple-500 outline-none"
                value={styleConfig.fontFamily}
                onChange={(e) => setStyleConfig({...styleConfig, fontFamily: e.target.value as FontStyle})}
              >
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Animation</label>
              <select 
                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-purple-500 outline-none"
                value={styleConfig.animation}
                onChange={(e) => setStyleConfig({...styleConfig, animation: e.target.value as AnimationStyle})}
              >
                {ANIMATIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div>
                <label className="text-xs text-slate-400 mb-1 block">Text Color</label>
                <div className="flex items-center bg-slate-800 border border-slate-600 rounded p-1">
                  <input 
                    type="color" 
                    className="w-full h-8 rounded bg-transparent cursor-pointer"
                    value={styleConfig.color}
                    onChange={(e) => setStyleConfig({...styleConfig, color: e.target.value})}
                  />
                </div>
             </div>
             <div>
                <label className="text-xs text-slate-400 mb-1 block">Stroke</label>
                <div className="flex items-center bg-slate-800 border border-slate-600 rounded p-1">
                  <input 
                    type="color" 
                    className="w-full h-8 rounded bg-transparent cursor-pointer"
                    value={styleConfig.strokeColor}
                    onChange={(e) => setStyleConfig({...styleConfig, strokeColor: e.target.value})}
                  />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div>
                <label className="text-xs text-slate-400 mb-1 block">Highlight</label>
                <div className="flex items-center bg-slate-800 border border-slate-600 rounded p-1">
                  <input 
                    type="color" 
                    className="w-full h-8 rounded bg-transparent cursor-pointer"
                    value={styleConfig.highlightColor}
                    onChange={(e) => setStyleConfig({...styleConfig, highlightColor: e.target.value})}
                  />
                </div>
             </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Size: {styleConfig.fontSize}px</label>
                <input 
                 type="range"
                 min="20" max="100" 
                 value={styleConfig.fontSize}
                 onChange={(e) => setStyleConfig({...styleConfig, fontSize: parseInt(e.target.value)})}
                 className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
               />
             </div>
          </div>

          <div>
             <label className="text-xs text-slate-400 mb-1 block flex justify-between">
                <span>Vertical Position</span>
                <span>{styleConfig.yOffset}%</span>
             </label>
             <input 
               type="range" 
               min="10" max="90" 
               value={styleConfig.yOffset}
               onChange={(e) => setStyleConfig({...styleConfig, yOffset: parseInt(e.target.value)})}
               className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
             />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block flex justify-between">
                <span>Animation Speed</span>
                <span className="text-white font-mono">{styleConfig.animationSpeed.toFixed(1)}x</span>
            </label>
            <input 
              type="range" 
              min="0.5" max="3" step="0.1"
              value={styleConfig.animationSpeed}
              onChange={(e) => setStyleConfig({...styleConfig, animationSpeed: parseFloat(e.target.value)})}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

        </section>

        <hr className="border-slate-700" />

        {/* Subtitles List */}
        <section className="space-y-2">
           <h3 className="text-sm uppercase tracking-wider text-slate-400 font-semibold mb-2">Transcript</h3>
           <div className="space-y-3">
             {subtitles.map((sub, idx) => (
               <div 
                  key={sub.id} 
                  onClick={() => onSeek(sub.start)}
                  className={`relative p-3 rounded-lg border transition-all cursor-pointer group ${
                    idx === activeSubIndex 
                      ? 'bg-purple-900/20 border-purple-500/50' 
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
               >
                 {/* Precision Time Controls (Restored) */}
                 <div className="flex gap-2 mb-2">
                    <div className="flex items-center bg-slate-900/50 rounded px-1.5 py-0.5 border border-slate-700/50">
                        <span className="text-[10px] text-slate-500 mr-1">IN</span>
                        <input 
                            type="number" step="0.1" 
                            className="bg-transparent w-12 text-xs text-green-400 font-mono outline-none"
                            value={sub.start}
                            onChange={(e) => handleTimeUpdate(sub.id, 'start', parseFloat(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="flex items-center bg-slate-900/50 rounded px-1.5 py-0.5 border border-slate-700/50">
                        <span className="text-[10px] text-slate-500 mr-1">OUT</span>
                        <input 
                            type="number" step="0.1" 
                            className="bg-transparent w-12 text-xs text-red-400 font-mono outline-none"
                            value={sub.end}
                            onChange={(e) => handleTimeUpdate(sub.id, 'end', parseFloat(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                 </div>

                 <div className="flex gap-2">
                    <textarea 
                      rows={2}
                      className="w-full bg-transparent text-white resize-none outline-none text-sm font-medium leading-tight"
                      value={sub.text}
                      onChange={(e) => handleSubChange(sub.id, e.target.value)}
                      onSelect={(e) => setCursorPos(e.currentTarget.selectionStart)}
                      onClick={(e) => e.stopPropagation()} 
                    />
                    
                    {idx === activeSubIndex && (
                       <button
                         title="Split at cursor"
                         onClick={(e) => {
                           e.stopPropagation();
                           if (cursorPos !== null) onSplit(sub.id, cursorPos);
                         }}
                         className="self-start p-1.5 rounded bg-slate-700 hover:bg-purple-600 hover:text-white text-slate-400 transition-colors"
                       >
                         <Scissors size={14} />
                       </button>
                    )}
                 </div>
               </div>
             ))}
             {subtitles.length === 0 && (
               <div className="text-slate-500 text-sm text-center italic py-4">
                 Upload a video to see subtitles.
               </div>
             )}
           </div>
        </section>
      </div>

      {/* Playback Controls (Sticky Bottom) */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
         <div className="flex items-center justify-center gap-6 mb-2">
             <button onClick={() => onSeek(Math.max(0, currentTime - 5))} className="text-slate-400 hover:text-white">
                <Rewind size={20} />
             </button>
             <button 
              onClick={onTogglePlay}
              className="w-12 h-12 rounded-full bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
            >
              {isPlaying ? <Pause className="fill-current" size={24} /> : <Play className="fill-current ml-1" size={24} />}
            </button>
            <button onClick={() => onSeek(Math.min(duration, currentTime + 5))} className="text-slate-400 hover:text-white">
                <FastForward size={20} />
             </button>
         </div>
         <div className="flex items-center gap-3">
             <span className="text-xs text-slate-400 font-mono w-12 text-right">{formatTime(currentTime)}</span>
             <input 
                type="range"
                min="0"
                max={duration || 100}
                step="0.01"
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
             />
             <span className="text-xs text-slate-400 font-mono w-12">{formatTime(duration)}</span>
         </div>
      </div>
    </div>
  );
};

export default Controls;