import React from 'react';
import Logo from './Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title, 
  subtitle 
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-secondary p-8 rounded-xl border border-border shadow-xl transform transition-all fade-in">
        <div className="flex flex-col items-center justify-center">
          <Logo size="lg" className="mb-6" />
          
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-foreground font-heading">
            {title}
          </h2>
          
          {subtitle && (
            <p className="mt-2 text-center text-sm text-muted">
              {subtitle}
            </p>
          )}
        </div>
        
        <div className="mt-8 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout; 