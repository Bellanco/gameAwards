/**
 * Tabs - Componente de pestañas reutilizable
 * Proporciona navegación por pestañas con contenido dinámico
 */
export default function Tabs({
  tabs, // Array: [{ id: string, label: string, icon?: ReactNode, content: ReactNode }, ...]
  activeTab,
  onTabChange,
  variant = 'default', // 'default' | 'pills' | 'underline'
  size = 'md' // 'sm' | 'md' | 'lg'
}) {
  const sizeClass = {
    'sm': 'px-2 py-1 text-sm',
    'md': 'px-4 py-2 text-base',
    'lg': 'px-6 py-3 text-lg'
  }[size] || 'px-4 py-2 text-base';

  const tabClass = {
    'default': `
      ${sizeClass}
      font-semibold
      theme-text-secondary hover:theme-text-primary
      transition-colors
      border-b-2 border-transparent
      hover:border-yellow-500
      cursor-pointer
    `,
    'pills': `
      ${sizeClass}
      font-semibold
      theme-card theme-border-primary border rounded-lg
      theme-text-secondary hover:theme-text-primary
      transition-all
      cursor-pointer
    `,
    'underline': `
      ${sizeClass}
      font-semibold
      theme-text-secondary hover:theme-text-primary
      transition-colors
      border-b-2 border-slate-700
      hover:border-yellow-500
      cursor-pointer
    `
  }[variant] || '';

  const activeTabClass = {
    'default': 'border-b-2 border-yellow-500 theme-text-primary',
    'pills': 'theme-text-primary bg-yellow-500/10 border-yellow-500',
    'underline': 'border-b-2 border-yellow-500 theme-text-primary'
  }[variant] || '';

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className={`
        flex gap-2 sm:gap-4 overflow-x-auto pb-2
        ${variant === 'pills' ? 'p-2' : ''}
      `}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              ${tabClass}
              ${activeTab === tab.id ? activeTabClass : ''}
              flex items-center gap-2 whitespace-nowrap
            `}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="w-full">
        {tabs.find(tab => tab.id === activeTab)?.content || null}
      </div>
    </div>
  );
}
