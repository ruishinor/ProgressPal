import uiCopy from '@/ui-copy/interface.json';
import { startTransition, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { CourseMapSummary } from '@/features/course/components/CourseMapSummary';
import { CourseUnitCard } from '@/features/course/components/CourseUnitCard';
import { buildCourseMap, type CourseMapView } from '@/features/course/model';
import { buildLongFormProgressMap } from '@/lib/progress';
import { useAppState } from '@/lib/appState';
import { getCatalogueCourseState, getXpSummary } from '@/lib/db';
import { requireProgrammeScope } from '@/lib/domain';

type CoursePageStatus = 'error' | 'loading' | 'ready';

type CoursePageState = {
  courseMap: CourseMapView | null;
  error: string | null;
  status: CoursePageStatus;
  xpLevel: number | null;
};

const initialState: CoursePageState = {
  courseMap: null,
  error: null,
  status: 'loading',
  xpLevel: null,
};

export function CoursePage() {
  const { programmeScope } = useAppState();
  const { copy } = requireProgrammeScope(useAppState().programmeScope).content
    .terminology;
  const [state, setState] = useState<CoursePageState>(initialState);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadCourseMap() {
      startTransition(() => {
        setState((currentState) => ({
          ...currentState,
          error: null,
          status: 'loading',
        }));
      });

      try {
        // Catalogue-derived rows are the active catalogue's (Epic C / C5);
        // the learner level stays global (OD-1).
        const [
          {
            contentAssets,
            contentSlices,
            courseItems: items,
            courseUnits: units,
            mediaProgressEvents,
            progressEntries,
            resumePoints,
          },
          xpSummary,
        ] = await Promise.all([
          getCatalogueCourseState({
            catalogueId: requireProgrammeScope(programmeScope).catalogueId,
          }),
          getXpSummary({
            programmeId: requireProgrammeScope(programmeScope).programmeId,
            levelCurve: requireProgrammeScope(programmeScope).policy.levelCurve,
          }),
        ]);

        if (!isActive) {
          return;
        }

        const courseMap = buildCourseMap(
          units,
          items,
          progressEntries,
          buildLongFormProgressMap(
            contentAssets,
            contentSlices,
            mediaProgressEvents,
            resumePoints,
            progressEntries,
          ),
          requireProgrammeScope(programmeScope).policy.catalogueRules,
        );

        startTransition(() => {
          setState({
            courseMap,
            error: null,
            status: 'ready',
            xpLevel: xpSummary.level,
          });
        });
      } catch (loadError) {
        console.error('Course map loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            courseMap: null,
            error: 'The local course catalog could not be loaded.',
            status: 'error',
            xpLevel: null,
          });
        });
      }
    }

    void loadCourseMap();

    return () => {
      isActive = false;
    };
  }, [programmeScope, reloadToken]);

  if (state.status === 'loading' || state.courseMap === null) {
    if (state.status === 'error') {
      return (
        <section className="page-section">
          <PageHeader
            description={copy.courseMapErrorDescription}
            eyebrow={copy.courseMapEyebrow}
            title={uiCopy.surfaces.courseCoursePage.courseMap}
          />
          <ErrorState
            action={
              <button
                className="button button--secondary button--md"
                onClick={() => {
                  startTransition(() => {
                    setState(initialState);
                  });
                  setReloadToken((currentToken) => currentToken + 1);
                }}
                type="button"
              >
                {uiCopy.surfaces.courseCoursePage.tryAgain}
              </button>
            }
            description={
              state.error ??
              uiCopy.surfaces.courseCoursePage.unknownLocalCourseMapError
            }
            title={uiCopy.surfaces.courseCoursePage.courseDataCouldNotBeRead}
          />
        </section>
      );
    }

    return (
      <section className="page-section">
        <PageHeader
          description={copy.courseMapLoadingDescription}
          eyebrow={copy.courseMapEyebrow}
          title={uiCopy.surfaces.courseCoursePage.courseMap}
        />
        <LoadingState
          description={uiCopy.surfaces.courseCoursePage.buildingYourCourseMap}
          title={uiCopy.surfaces.courseCoursePage.loadingCourseMap}
        />
      </section>
    );
  }

  return (
    <section className="page-section">
      <PageHeader
        actions={
          <div className="action-row">
            <Link className="button button--secondary button--md" to="/">
              {uiCopy.surfaces.courseCoursePage.backToProfile}
            </Link>
            <Link className="button button--primary button--md" to="/dashboard">
              {uiCopy.surfaces.courseCoursePage.openDashboard}
            </Link>
          </div>
        }
        description={
          uiCopy.surfaces.courseCoursePage.openAnyTaskToSaveYourProgressNotes
        }
        eyebrow={copy.courseMapEyebrow}
        meta={
          <>
            {state.xpLevel !== null ? (
              <Badge tone="accent">{`Level ${state.xpLevel}`}</Badge>
            ) : null}
            <StatusPill
              variant={
                state.courseMap.blockedItemCount > 0
                  ? 'blocked'
                  : state.courseMap.completionPercent === 100
                    ? 'completed'
                    : 'inProgress'
              }
            >
              {state.courseMap.blockedItemCount > 0
                ? uiCopy.surfaces.courseCoursePage.blockedItemsPresent
                : state.courseMap.completionPercent === 100
                  ? uiCopy.surfaces.courseCoursePage.courseComplete
                  : uiCopy.surfaces.courseCoursePage.courseInProgress}
            </StatusPill>
          </>
        }
        title={uiCopy.surfaces.courseCoursePage.courseMap}
      />
      <CourseMapSummary courseMap={state.courseMap} />
      <div className="course-unit-list">
        {state.courseMap.units.map((unit) => (
          <CourseUnitCard key={unit.id} unit={unit} />
        ))}
      </div>
    </section>
  );
}
