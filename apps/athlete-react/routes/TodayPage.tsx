import React from 'react';
import {
  BottomNav,
  ChipRail,
  EmptyState,
  Hero,
  MetricStrip,
  PrimaryAction,
  SecondaryAction,
  SectionCard,
  TopBar,
  WorkoutCard,
} from '../../../packages/ui/index.js';
import type { TodayPageProps, WorkoutBlockSummary } from '../types';

const BottomNavView = BottomNav as any;
const ChipRailView = ChipRail as any;
const EmptyStateView = EmptyState as any;
const HeroView = Hero as any;
const MetricStripView = MetricStrip as any;
const PrimaryActionView = PrimaryAction as any;
const SecondaryActionView = SecondaryAction as any;
const SectionCardView = SectionCard as any;
const TopBarView = TopBar as any;
const WorkoutCardView = WorkoutCard as any;

export default function TodayPage({
  snapshot,
  viewModel,
  loading,
  error,
  message,
  progressMessage,
  onOpenImport,
  onSelectWeek,
  onSelectDay,
  onResetDay,
  onStartAuth,
  onSignOut,
}: TodayPageProps) {
  const profile = snapshot?.profile || null;
  const workout = viewModel?.workout || null;
  const workoutBlocks: WorkoutBlockSummary[] = Array.isArray(workout?.blocks) ? workout.blocks : [];

  return (
    <>
      <TopBarView
        eyebrow="Ryxen Athlete"
        title="Editorial Today"
        subtitle={profile?.email ? profile.email : 'Shell React/Vite em rollout controlado, ligada aos mesmos contratos de sessão e plano importado do app atual.'}
        actions={(
          <>
            <a className="ath-legacyLink" href="/sports/cross/index.html?legacy=1">Abrir legado</a>
            {profile?.email ? (
              <SecondaryActionView onClick={onSignOut}>Sair</SecondaryActionView>
            ) : (
              <PrimaryActionView onClick={onStartAuth}>Entrar com Google</PrimaryActionView>
            )}
          </>
        )}
      />

      <HeroView
        eyebrow={viewModel?.hero?.eyebrow}
        title={loading ? 'Carregando Today' : viewModel?.hero?.title || 'Today'}
        subtitle={error || progressMessage || message || viewModel?.hero?.subtitle}
        badges={viewModel?.hero?.badges || []}
        actions={(
          <>
            <PrimaryActionView onClick={onOpenImport}>Importar plano</PrimaryActionView>
            <SecondaryActionView onClick={onResetDay}>Dia automático</SecondaryActionView>
          </>
        )}
        aside={viewModel?.importedPlanSummary ? (
          <div className="ath-heroAsideCard">
            <span className="ath-heroAsideLead">Plano em foco</span>
            <strong>{viewModel.importedPlanSummary.fileName}</strong>
            <span>{viewModel.importedPlanSummary.weekNumbers?.length ? `Semanas ${viewModel.importedPlanSummary.weekNumbers.join(', ')}` : 'Semanas detectadas localmente'}</span>
          </div>
        ) : (
          <div className="ath-heroAsideCard">
            <span className="ath-heroAsideLead">Sem plano local</span>
            <strong>Importe PDF, imagem ou texto</strong>
            <span>O review ativo abre antes de qualquer salvamento.</span>
          </div>
        )}
      />

      <MetricStripView metrics={viewModel?.metrics || []} />

      {viewModel?.weekItems?.length ? (
        <ChipRailView label="Semanas" items={viewModel.weekItems} onSelect={onSelectWeek} />
      ) : null}

      {viewModel?.dayItems?.length ? (
        <ChipRailView label="Dias" items={viewModel.dayItems} onSelect={onSelectDay} />
      ) : null}

      {workout ? (
        <>
          <SectionCardView
            eyebrow="Overview"
            title={workout.day || snapshot?.currentDay || 'Treino do dia'}
            subtitle={snapshot?.workoutMeta?.blockCount ? `${snapshot.workoutMeta.blockCount} blocos em leitura direta do plano importado.` : 'Leitura do plano disponível.'}
          >
            <div className="ath-overviewGrid">
              <div className="ath-overviewStat">
                <span>Semana</span>
                <strong>{snapshot?.activeWeekNumber || '-'}</strong>
              </div>
              <div className="ath-overviewStat">
                <span>Fonte</span>
                <strong>{snapshot?.workoutContext?.source || '-'}</strong>
              </div>
              <div className="ath-overviewStat">
                <span>Dia</span>
                <strong>{snapshot?.currentDay || '-'}</strong>
              </div>
            </div>
          </SectionCardView>

          <SectionCardView eyebrow="Blocos" title="Treino estruturado" subtitle="Leitura orientada por blocos, períodos e objetivo.">
            {workoutBlocks.map((block, index) => (
              <WorkoutCardView key={`${block.type || 'block'}-${block.title || 'untitled'}-${index}`} block={block} index={index} />
            ))}
          </SectionCardView>
        </>
      ) : (
        <EmptyStateView
          title="Sem treino estruturado por aqui ainda"
          copy="Você pode importar um plano local agora ou entrar para usar o snapshot remoto da conta quando houver um plano sincronizado."
          actions={(
            <>
              <PrimaryActionView onClick={onOpenImport}>Importar agora</PrimaryActionView>
              {!profile?.email ? <SecondaryActionView onClick={onStartAuth}>Entrar</SecondaryActionView> : null}
            </>
          )}
        />
      )}

      <SectionCardView eyebrow="Roadmap" title="History e Account entram depois" subtitle="O piloto está centrado no Today, com uma estética nova e uma revisão de importação que o atleta controla.">
        <div className="ath-roadmapGrid">
          <article className="ath-roadmapCard">
            <strong>History</strong>
            <span>Em breve na shell nova, com timeline unificada.</span>
          </article>
          <article className="ath-roadmapCard">
            <strong>Account</strong>
            <span>Conta, preferências e sync entram na próxima etapa.</span>
          </article>
          <article className="ath-roadmapCard">
            <strong>Fallback</strong>
            <span>O legado segue disponível para comparação e segurança de rollout.</span>
          </article>
        </div>
      </SectionCardView>

      <BottomNavView
        items={[
          { key: 'today', label: 'Today', caption: 'piloto ativo', active: true, href: '/athlete/' },
          { key: 'history', label: 'History', caption: 'em breve', disabled: true, href: '/athlete/' },
          { key: 'account', label: 'Account', caption: 'em breve', disabled: true, href: '/athlete/' },
          { key: 'legacy', label: 'Legado', caption: 'fallback', href: '/sports/cross/index.html?legacy=1' },
        ]}
      />
    </>
  );
}
