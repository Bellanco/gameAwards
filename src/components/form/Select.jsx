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
        <label className="block text-sm font-bold theme-text-secondary mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
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
        <p className="text-xs text-red-400 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
