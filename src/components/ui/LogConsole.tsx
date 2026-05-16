import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

export function LogConsole() {
  const [logs, setLogs] = useState<{ level: string, message: string, timestamp: string }[]>([]);

  useEffect(() => {
    const unlisten = listen('app-log', (event: any) => {
      setLogs(prev => [...prev, event.payload].slice(-100));
    });
    return () => {
      unlisten.then((fn: () => void) => fn());
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 w-96 h-64 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl z-50 font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <span className="text-slate-400 font-bold">SYSTEM LOG</span>
        <button onClick={() => setLogs([])} className="text-slate-500 hover:text-white transition-colors">Clear</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
        {logs.length === 0 && <p className="text-slate-600 italic">Waiting for logs...</p>}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
            <span className={`${log.level === 'ERROR' ? 'text-red-400' : 'text-blue-400'} font-bold shrink-0`}>
              {log.level}:
            </span>
            <span className="text-slate-300 break-all">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
