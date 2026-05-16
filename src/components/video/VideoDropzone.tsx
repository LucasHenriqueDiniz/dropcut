import { useState } from 'react';
import { Button } from '../ui/Button';
import { open } from '@tauri-apps/plugin-dialog';
import { UploadCloud, Video } from 'lucide-react';

type Props = { onSelect: (path: string) => void };

export function VideoDropzone({ onSelect }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [dropMessage, setDropMessage] = useState<string | null>(null);

  const handleOpen = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'mkv', 'avi'] }]
    });
    if (typeof selected === 'string') {
      onSelect(selected);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const path = (file as File & { path?: string }).path;
      if (path) {
        onSelect(path);
        return;
      }

      setDropMessage('Drop detected, but Windows did not expose the file path here. Use Choose video to grant access.');
    }
  };

  return (
    <div 
      onDragOver={handleDragOver} 
      onDragLeave={handleDragLeave} 
      onDrop={handleDrop}
      className={`group relative flex min-h-[260px] w-full flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed p-10 text-center transition-all duration-300 ${
        isDragging 
          ? 'scale-[1.01] border-[#4fc3a1] bg-[#1d9e75]/15' 
          : 'border-white/10 bg-white/[0.02] hover:border-[#4fc3a1]/45'
      }`}
    >
      <div className={`grid size-12 place-items-center rounded-xl transition-transform duration-300 ${isDragging ? 'scale-110 bg-[#4fc3a1]/20 text-[#4fc3a1]' : 'bg-[#4fc3a1]/10 text-[#4fc3a1]'}`}>
        {isDragging ? <UploadCloud size={28} /> : <Video size={28} />}
      </div>
      
      <div className="space-y-1">
        <p className={`text-sm font-medium ${isDragging ? 'text-white' : 'text-slate-100'}`}>
          {isDragging ? 'Drop to load video' : 'Drop video anywhere'}
        </p>
        <p className="max-w-sm text-[11px] text-white/35">
          MP4, MOV, MKV, WEBM and AVI. Drag a video onto the workspace or use the picker below.
        </p>
      </div>

      <Button type="button" onClick={handleOpen} className="mt-1 bg-[#1d9e75] px-5 py-2 text-xs hover:bg-[#188866]">
        Choose video
      </Button>

      {dropMessage && (
        <div className="max-w-sm rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
          {dropMessage}
        </div>
      )}

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 rounded-[14px] border border-[#4fc3a1]/70 animate-pulse" />
      )}
    </div>
  );
}
