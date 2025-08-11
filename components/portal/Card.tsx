import React from "react";

interface CardProps {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function Card({ title, right, children, className = "" }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-4">
          {title ? <h3 className="text-base font-semibold text-gray-900">{title}</h3> : <div />}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
