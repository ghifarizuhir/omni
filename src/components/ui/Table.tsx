import React from 'react';
import { cn } from '@/src/lib/utils';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ className, ...props }) => (
  <table className={cn("w-full text-left border-collapse", className)} {...props} />
);

export const THead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className, ...props }) => (
  <thead className={cn("bg-ois-surface border-b border-ois-border", className)} {...props} />
);

export const TBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className, ...props }) => (
  <tbody className={cn("divide-y divide-ois-border", className)} {...props} />
);

export const TR: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className, ...props }) => (
  <tr className={cn("group transition-colors hover:bg-ois-surface-muted/50", className)} {...props} />
);

export const TH: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className, ...props }) => (
  <th className={cn("px-4 py-3 text-[11px] font-bold text-ois-text-subtle uppercase tracking-wider", className)} {...props} />
);

export const TD: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className, ...props }) => (
  <td className={cn("px-4 py-4 text-sm text-ois-text", className)} {...props} />
);
