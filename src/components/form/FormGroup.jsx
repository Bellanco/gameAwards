/**
 * FormGroup - Componente para agrupar campos de formulario
 * Proporciona estructura consistente
 */
export default function FormGroup({
  children,
  className = ''
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  );
}
