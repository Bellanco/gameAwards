/**
 * Checkbox - Componente checkbox reutilizable
 */
export default function Checkbox({
  label,
  name,
  checked = false,
  onChange,
  disabled = false,
  error = null,
  className = ''
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <input
        id={name}
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={!!error}
        className={`
          w-5 h-5 rounded
          theme-container-secondary theme-border-primary border
          cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : ''}
        `}
      />
      {label && (
        <label htmlFor={name} className="text-sm theme-text-primary font-medium cursor-pointer">
          {label}
        </label>
      )}
      {error && (
        <p className="text-xs text-red-400 ml-auto">
          {error}
        </p>
      )}
    </div>
  );
}
