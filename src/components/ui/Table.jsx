/**
 * Componente Table - Tabla genérica reutilizable
 * 
 * @typedef {Object} TableProps
 * @property {string[]} columns - Encabezados de columnas
 * @property {(string|number|React.ReactNode)[][]} rows - Datos de filas (array de arrays)
 * @property {Function} [onRowClick] - Callback cuando se hace click en una fila
 * @property {string} [className] - Clases Tailwind adicionales
 * @property {boolean} [striped=false] - Alternar colores de filas
 * @property {boolean} [bordered=true] - Mostrar bordes
 * @property {boolean} [hover=true] - Efecto hover en filas
 * 
 * @param {TableProps} props
 * @returns {React.ReactElement}
 * 
 * Uso: <Table columns={['Nombre', 'Email']} rows={[['Juan', 'juan@email.com']]} />
 */

import React from 'react';

export default function Table({
  columns = [],
  rows = [],
  onRowClick,
  className = '',
  emptyText = '—'
}) {
  return (
    <div className={`bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="grid gap-4 bg-slate-900/50 p-4 font-bold text-slate-300 border-b border-slate-700"
        style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
        {columns.map((col, idx) => (
          <div key={idx} className="text-left">{col}</div>
        ))}
      </div>

      {/* Body */}
      <div className="divide-y divide-slate-700">
        {rows.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-sm">
            {emptyText}
          </div>
        ) : (
          rows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={`grid gap-4 p-4 items-center hover:bg-slate-800/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
              onClick={onRowClick ? () => onRowClick(rowIdx, row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(rowIdx, row);
                      }
                    }
                  : undefined
              }
            >
              {row.map((cell, cellIdx) => (
                <div key={cellIdx} className="text-slate-300 text-sm">
                  {cell}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
