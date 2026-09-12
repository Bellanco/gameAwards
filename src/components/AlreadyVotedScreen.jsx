import React from 'react';
import { useTranslation } from '../data/literals';
import { useAppContext } from '../context/AppContext';
import { CheckmarkIcon } from './Icons';
import { ScreenLayout } from './layouts';
import { Header } from './ui';
import { MAX_BALLOT_EDITS } from '../utils/ballotEdits';

/**
 * AlreadyVotedScreen
 * Se muestra cuando el usuario autenticado YA tiene un voto registrado en esta
 * edición. Sigue bloqueando el re-voto (un voto por persona, un solo documento),
 * pero ofrece MODIFICARLO mientras la votación esté abierta y le queden
 * modificaciones (el tope lo cuenta el servidor, ver utils/ballotEdits.js).
 *
 * @param {Object} props
 * @param {string} props.userNickname
 * @param {Function} [props.onLogout]
 * @param {boolean} [props.canEdit] - quedan modificaciones y la votación sigue abierta
 * @param {number} [props.remainingEdits]
 * @param {Function} [props.onEdit]
 */
export default function AlreadyVotedScreen({
  userNickname,
  onLogout,
  canEdit = false,
  remainingEdits = 0,
  onEdit,
}) {
  const { language } = useAppContext();
  const t = useTranslation(language);

  const editsText = t('editsRemaining')
    .replace('{count}', remainingEdits)
    .replace('{max}', MAX_BALLOT_EDITS);

  const headerContent = (
    <Header
      title={t('alreadyVotedTitle')}
      subtitle={t('alreadyVotedMessage')}
    />
  );

  return (
    <ScreenLayout
      header={headerContent}
      showControlBar={false}
    >
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 rounded-full bg-status-success-light flex items-center justify-center">
              <CheckmarkIcon className="w-14 h-14 text-status-success" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight theme-display uppercase theme-text-primary mb-4">
            {t('alreadyVotedTitle')}
          </h1>

          <p className="text-xl theme-text-secondary mb-8">
            {userNickname ? `${t('thankYou')}, ${userNickname}.` : ''} {t('alreadyVotedMessage')}
          </p>

          <div className="theme-card theme-border-primary border rounded-xl p-6 mb-8">
            <p className="theme-text-primary leading-relaxed">
              {canEdit ? t('alreadyVotedEditable') : t('alreadyVotedNote')}
            </p>
            {canEdit && (
              <p className={`mt-3 text-sm font-semibold ${remainingEdits === 1 ? 'text-status-warning' : 'theme-accent'}`}>
                {remainingEdits === 1 ? t('lastEditWarning') : editsText}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {canEdit && onEdit && (
              <button
                onClick={onEdit}
                className="w-full min-h-[44px] py-4 px-6 rounded-xl font-bold text-lg theme-btn-primary hover:shadow-lg transition-all"
              >
                {t('editMyVote')}
              </button>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full min-h-[44px] py-4 px-6 rounded-xl font-bold text-lg theme-btn-secondary border theme-border-primary hover:shadow-lg transition-all"
              >
                {t('signOut')}
              </button>
            )}
          </div>
        </div>
      </div>
    </ScreenLayout>
  );
}
