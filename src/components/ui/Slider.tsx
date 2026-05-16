import type { InputHTMLAttributes } from 'react';

export function Slider(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="range" {...props} className={`w-full ${props.className ?? ''}`} />;
}
