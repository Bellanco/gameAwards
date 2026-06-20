/**
 * Select - Componente select reutilizable
 * Soporta opciones, validación y estados
 */
export default function Select({
  label,
  name,
  value,
  onChange,
  options = [], // Array: [{ value: string, label: string }, ...]
  disabled = false,
  error = null,
  required = false,
  placeholder = 'Seleccionar...',
  className = ''
}) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="block text-sm font-bold theme-text-secondary mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`
          w-full px-4 py-3
          theme-container-secondary theme-border-primary border rounded-lg
          theme-text-primary
          focus:border-yellow-500 focus:outline-none
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${name}-error`} className="text-xs text-red-400 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
