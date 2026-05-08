import React from 'react';
import { Table, THead, TBody, TR, TH, TD } from './Table';
import { cn } from '@/src/lib/utils';

export interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T extends { id: string | number }>({ 
  columns, 
  data, 
  onRowClick,
  className 
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table>
        <THead>
          <TR>
            {columns.map((col, idx) => (
              <TH key={idx} className={col.className}>{col.header}</TH>
            ))}
          </TR>
        </THead>
        <TBody>
          {data.length > 0 ? (
            data.map((item) => (
              <TR 
                key={item.id} 
                onClick={() => onRowClick?.(item)}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {columns.map((col, idx) => (
                  <TD key={idx} className={col.className}>
                    {col.accessor(item)}
                  </TD>
                ))}
              </TR>
            ))
          ) : (
            <TR>
              <TD colSpan={columns.length} className="py-12 text-center text-ois-text-subtle italic">
                No data available
              </TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}
