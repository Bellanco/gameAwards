import React, { useState } from 'react';
import { useTranslation } from '../data/literals';
import { getGameImage, categoryBackgrounds } from '../data/gameData';
import { ChevronLeftIcon, ChevronRightIcon, CheckmarkIcon, LanguageIcon } from './Icons';

/**
 * VoteScreen v2 - Con carrusel, idioma, icons profesionales e imágenes
 */
export default function VoteScreen({
  category,
  currentStep,
  totalSteps,
  userVotes,
  onSelectOption,
  onPrevious,
  onNext,
  onSkip,
  progressPercentage,
  language,
  onToggleLanguage
}) {
  const t = useTranslation(language);
  const isVoted = !!userVotes[category.id];
  const selectedOption = userVotes[category.id];
  const categoryBg = categoryBackgrounds[category.id] || 'https://media.rawg.io/media/games/56d/56d006318db933179cdee675e37e3f1a.jpg';
  const optionCount = category.options.length;

  function getGridColsClass(count) {
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3';
    if (count === 4) return 'grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4';
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6';
    if (count <= 8) return 'grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8';
    return 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Selector de idioma */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={onToggleLanguage}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-sm font-semibold transition-all"
        >
          <LanguageIcon className="w-4 h-4" />
          <span>{language.toUpperCase()}</span>
        </button>
      </div>

      {/* Background */}
      <div className="absolute inset-0 h-80 overflow-hidden">
        <img
          src={categoryBg}
          alt={category.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/1920x400/1f2937/666666';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-slate-950" />
      </div>

      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400 uppercase font-semibold">
                {currentStep + 1} {t('of')} {totalSteps}
              </span>
              <span className="text-xs text-yellow-400 font-bold">{progressPercentage}%</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white truncate">
            {category.title}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 pt-40 pb-32 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-300 mb-8 text-sm md:text-base">
            {isVoted ? `${t('yourSelection')} ${selectedOption}` : t('chooseYourFavorite')}
          </p>

          {/* Grid de opciones */}
          <div className={`grid ${getGridColsClass(optionCount)} gap-4 md:gap-6 mb-8`}>
            {category.options.map((option) => {
              const isSelected = selectedOption === option;
              const gameImage = getGameImage(option);

              return (
                <button
                  key={option}
                  onClick={() => onSelectOption(category.id, option)}
                  className="group relative overflow-hidden rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <div
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-yellow-500 shadow-lg shadow-yellow-500/50'
                        : 'border-slate-700 hover:border-yellow-500/50'
                    }`}
                  >
                    {/* Imagen */}
                    <img
                      src={gameImage}
                      alt={option}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x400/1f2937/ffffff?text=' + encodeURIComponent(option);
                      }}
                    />

                    {/* Overlay */}
                    <div
                      className={`absolute inset-0 transition-all duration-300 ${
                        isSelected
                          ? 'bg-gradient-to-t from-black to-yellow-500/20'
                          : 'bg-gradient-to-t from-black/80 to-transparent group-hover:from-black'
                      }`}
                    />

                    {/* Checkmark */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                        <CheckmarkIcon className="w-5 h-5 text-black" />
                      </div>
                    )}

                    {/* Nombre del juego */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                      <p className="font-bold text-sm md:text-base text-white line-clamp-2 leading-tight">
                        {option}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Status */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/30 border border-slate-700 rounded-lg">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isVoted ? 'text-green-400' : 'text-amber-400'
              }`}
            >
              {isVoted ? t('voted') : t('pending')}
            </span>
            <span className="text-xs text-slate-400">
              {t('categoryLabel')} {currentStep + 1} {t('of')} {totalSteps}
            </span>
          </div>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/90 to-transparent border-t border-slate-800 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={onPrevious}
              disabled={currentStep === 0}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all text-sm md:text-base ${
                currentStep === 0
                  ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed opacity-50'
                  : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800/70'
              }`}
            >
              {t('previous')}
            </button>

            <button
              onClick={onSkip}
              className="flex-1 py-3 px-4 rounded-lg font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800/70 transition-all text-sm md:text-base"
            >
              {t('skip')}
            </button>

            <button
              onClick={onNext}
              className="flex-1 py-3 px-4 rounded-lg font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 hover:from-yellow-400 hover:to-yellow-500 hover:shadow-lg hover:shadow-yellow-500/30 transition-all transform hover:scale-105 text-sm md:text-base"
            >
              {currentStep === totalSteps - 1 ? t('review') : t('next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
