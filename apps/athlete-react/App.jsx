import React from 'react';
import { AppFrame, useNativeShell, useReducedMotion } from '../../packages/ui/index.js';
import TodayPage from './routes/TodayPage.jsx';
import ImportReviewSheet from './components/ImportReviewSheet.jsx';
import { useAthleteTodaySnapshot } from './hooks/useAthleteTodaySnapshot.js';
import { useAthleteImportFlow } from './hooks/useAthleteImportFlow.js';
import { IMPORT_ACCEPT } from './services/appShellState.js';

export default function App() {
  const nativeShell = useNativeShell();
  const reducedMotion = useReducedMotion();
  const {
    snapshot,
    viewModel,
    loading,
    error,
    message,
    progressMessage,
    setError,
    setMessage,
    setProgressMessage,
    loadSnapshot,
    handleSelectWeek,
    handleSelectDay,
    handleResetDay,
    handleStartAuth,
    handleSignOut,
  } = useAthleteTodaySnapshot();
  const {
    fileInputRef,
    review,
    reviewText,
    reviewTextDeferred,
    importState,
    setReviewText,
    handleOpenImport,
    handleImportFileChange,
    handleReparseReview,
    handleConfirmReview,
    handleCancelReview,
  } = useAthleteImportFlow({
    snapshot,
    setError,
    setMessage,
    setProgressMessage,
    loadSnapshot,
  });

  return (
    <AppFrame nativeShell={nativeShell} reducedMotion={reducedMotion}>
      <input
        ref={fileInputRef}
        type="file"
        accept={IMPORT_ACCEPT}
        hidden
        onChange={handleImportFileChange}
      />

      <TodayPage
        snapshot={snapshot}
        viewModel={viewModel}
        loading={loading}
        error={error}
        message={message}
        progressMessage={progressMessage}
        onOpenImport={handleOpenImport}
        onSelectWeek={handleSelectWeek}
        onSelectDay={handleSelectDay}
        onResetDay={handleResetDay}
        onStartAuth={handleStartAuth}
        onSignOut={handleSignOut}
      />

      <ImportReviewSheet
        open={!!review}
        review={review}
        reviewText={reviewText}
        reviewTextDeferred={reviewTextDeferred}
        importState={importState}
        onClose={handleCancelReview}
        onChangeReviewText={setReviewText}
        onReparse={handleReparseReview}
        onConfirm={handleConfirmReview}
        onCancel={handleCancelReview}
      />
    </AppFrame>
  );
}
