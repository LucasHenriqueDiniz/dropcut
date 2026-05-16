import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
};

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white',
    ghost: 'bg-transparent hover:bg-white/10 text-slate-300',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
  };

  return (
    <button
      {...props}
      className={clsx(
        'rounded-xl px-4 py-2 font-semibold transition',
        variantClasses[variant],
        className
      )}
    />
  );
}
