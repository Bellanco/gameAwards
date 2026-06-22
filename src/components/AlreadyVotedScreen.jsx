import React from 'react';
import { useTranslation } from '../data/literals';
import { CheckmarkIcon } from './Icons';
import { ScreenLayout } from './layouts';
import { Header } from './ui';

/**
 * AlreadyVotedScreen
 * Se muestra cuando el usuario autenticado YA tiene un voto registrado en esta
 * edición. Bloquea el re-voto (un voto por persona) y permite cerrar sesión.
 */
export default function AlreadyVotedScreen({
  userNickname,
  onLogout,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme,
}) {
  const t = useTranslation(language);

  const headerContent = (
    <Header
      title={t('alreadyVotedTitle')}
      subtitle={t('alreadyVotedMessage')}
      language={language}
      onToggleLanguage={onToggleLanguage}
      theme={theme}
      onToggleTheme={onToggleTheme}
    />
  );

  return (
    <ScreenLayout
      language={language}
      onToggleLanguage={onToggleLanguage}
      theme={theme}
      onToggleTheme={onToggleTheme}
      header={headerContent}
      showControlBar={false}
    >
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 rounded-full bg-green-500/15 flex items-center justify-center">
              <CheckmarkIcon className="w-14 h-14 text-status-success" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight theme-text-primary mb-4">
            {t('alreadyVotedTitle')}
          </h1>

          <p className="text-xl theme-text-secondary mb-8">
            {userNickname ? `${t('thankYou')}, ${userNickname}.` : ''} {t('alreadyVotedMessage')}
          </p>

          <div className="theme-card theme-border-primary border rounded-xl p-6 mb-8">
            <p className="theme-text-primary leading-relaxed">
              {t('alreadyVotedNote')}
            </p>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full py-4 px-6 rounded-xl font-bold text-lg theme-btn-secondary border theme-border-primary hover:shadow-lg transition-all"
            >
              {t('signOut')}
            </button>
          )}
        </div>
      </div>
    </ScreenLayout>
  );
}
