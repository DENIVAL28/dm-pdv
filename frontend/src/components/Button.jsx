import React from 'react';

export default function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  ...props
}) {
  return (
    <button
      className={`btn ${variant} ${size} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
