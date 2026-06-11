import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ValidationTableProps {
  data: any[];
  type: 'valid' | 'invalid';
  onClose: () => void;
}

export function ValidationTable({ data, type, onClose }: ValidationTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;
  
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentRows = data.slice(startIndex, startIndex + rowsPerPage);

  if (data.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-500 font-medium">No {type} rows found.</p>
        <Button onClick={onClose} variant="outline" className="mt-4">Go Back</Button>
      </div>
    );
  }

  // Extract all unique headers from the current data view (excluding internal _ properties)
  const headers = Array.from(new Set(data.flatMap(row => Object.keys(row).filter(k => !k.startsWith('_'))))).slice(0, 8); // Limit to 8 columns for UI cleanless

  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${type === 'invalid' ? 'bg-red-50/50' : 'bg-emerald-50/50'}`}>
        <div className="flex items-center gap-2">
          {type === 'invalid' ? <AlertCircle className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          <h3 className="font-bold text-slate-800">
            {type === 'invalid' ? 'Error / Invalid Rows' : 'Valid Rows'} ({data.length.toLocaleString()})
          </h3>
        </div>
        <Button onClick={onClose} variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-slate-700">Close View</Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-bold">Row #</th>
              {type === 'invalid' && <th className="px-4 py-3 font-bold text-red-600">Errors</th>}
              {headers.map(h => (
                <th key={h} className="px-4 py-3 font-bold truncate max-w-[150px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-2.5 font-medium text-slate-500 whitespace-nowrap">
                  {row._rowIndex || (startIndex + idx + 1)}
                </td>
                {type === 'invalid' && (
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-1">
                      {row._errors?.map((err: string, i: number) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 whitespace-nowrap">
                          {err}
                        </span>
                      ))}
                    </div>
                  </td>
                )}
                {headers.map(h => (
                  <td key={h} className="px-4 py-2.5 text-slate-700 truncate max-w-[200px]" title={String(row[h] || '')}>
                    {row[h] !== undefined && row[h] !== null ? String(row[h]) : <span className="text-slate-300 italic">empty</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            Showing <span className="font-bold text-slate-700">{startIndex + 1}</span> to <span className="font-bold text-slate-700">{Math.min(startIndex + rowsPerPage, data.length)}</span> of <span className="font-bold text-slate-700">{data.length}</span> rows
          </span>
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-bold text-slate-700 px-2">{currentPage} / {totalPages}</span>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
