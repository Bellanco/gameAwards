/**
 * Componente Alert - Notificación reutilizable
 * 
 * @typedef {'success'|'error'|'warning'|'info'} AlertType
 * @typedef {Object} AlertProps
 * @property {React.ReactNode} children - Contenido del alert
 * @property {AlertType} [type='info'] - Tipo de alerta
 * @property {number} [autoClose=0] - Auto-cerrar en ms (0 = no cerrar)
 * @property {Function} [onClose] - Callback cuando se cierra
 * @property {string} [className] - Clases adicionales
 * @property {boolean} [closable=true] - Mostrar botón cerrar
 * 
 * @param {AlertProps} props
 * @returns {React.ReactElement|null}
 * 
 * Uso: <Alert type="success" autoClose={3000}>Guardado exitosamente</Alert>
 */

import React from 'react';
import { ALERT_ICONS } from './iconComponents.jsx';

export default function Alert({ 
  type = 'info', // 'success', 'error', 'warning', 'info'
  children, 
  onClose,
  autoClose = 0 // ms, 0 = no auto-close
}) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    if (autoClose > 0) {
      const timer = setTimeout(() => setVisible(false), autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose]);

  if (!visible) return null;

  const typeStyles = {
    success: 'status-success',
    error: 'status-error',
    warning: 'status-warning',
    info: 'status-info'
  };

  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  return (
    <div className={`
      p-4 border rounded-lg flex items-start justify-between gap-3
      ${typeStyles[type]}
    `}>
      <div className="flex items-start gap-2">
        {ALERT_ICONS[type]}
        <span className="text-sm">{children}</span>
      </div>
      {onClose && (
        <button
          onClick={handleClose}
          className="text-lg font-bold opacity-50 hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  );
}
