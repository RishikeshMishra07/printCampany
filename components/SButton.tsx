"use client";
import React from 'react';

interface SButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'critical' | 'plain';
  size?: 'slim' | 'large' | 'medium';
  loading?: boolean;
}

const SButton: React.FC<SButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  size = 'medium', 
  loading = false, 
  className = '', 
  style = {},
  ...props 
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'btn pr';
      case 'critical': return 'btn dn';
      case 'secondary': return 'btn';
      case 'plain': return 'btn plain';
      default: return 'btn';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'slim': return 'btn sm';
      case 'large': return 'btn lg';
      default: return '';
    }
  };

  return (
    <button 
      className={`${getVariantClass()} ${getSizeClass()} ${className}`} 
      style={{ ...style }}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading && (
        <span className="spin" style={{ width: 12, height: 12, borderTopColor: 'currentColor' }}></span>
      )}
      {children}
    </button>
  );
};

export default SButton;
