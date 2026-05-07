/**
 * Footer - Componente de pie de página reutilizable
 * Muestra navegación y controles
 */
export default function Footer({
  children,
  justify = 'between', // 'between' | 'center' | 'start' | 'end'
  border = true,
  className = ''
}) {
  const justifyClass = {
    'between': 'justify-between',
    'center': 'justify-center',
    'start': 'justify-start',
    'end': 'justify-end'
  }[justify] || 'justify-between';

  return (
    <div className={`
      px-4 sm:px-6 lg:px-8 landscape:px-2 py-4 sm:py-6 landscape:py-1.5
      flex flex-col sm:flex-row landscape:flex-row gap-3 sm:gap-4 landscape:gap-1.5
      ${justifyClass}
      ${border ? 'theme-border-primary border-t' : ''}
      theme-footer
      ${className}
    `}>
      {children}
    </div>
  );
}
