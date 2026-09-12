/**
 * TextInput - Componente input reutilizable
 * Soporta validación, errores y estados
 */
export default function TextInput({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  maxLength,
  disabled = false,
  error = null,
  help = null,
  required = false,
  className = ''
}) {
  const describedBy = error ? `${name}-error` : (help ? `${name}-help` : undefined);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="block text-sm font-bold theme-text-secondary mb-2">
          {label}
          {required && <span className="text-status-error ml-1">*</span>}
        </label>
      )}
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`
          w-full px-4 py-3 
          theme-container-secondary theme-border-primary border rounded-lg 
          theme-text-primary theme-placeholder 
          focus:outline-hidden focus:border-(--color-accent) focus-visible:ring-2 focus-visible:ring-(--color-accent)/40 
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-status-error' : ''}
          ${className}
        `}
      />
      {maxLength && (
        <p className="text-sm theme-text-secondary mt-1">
          {value?.length || 0}/{maxLength}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-sm text-status-error mt-1">
          {error}
        </p>
      )}
      {help && !error && (
        <p id={`${name}-help`} className="text-sm theme-text-secondary mt-1">
          {help}
        </p>
      )}
    </div>
  );
}
