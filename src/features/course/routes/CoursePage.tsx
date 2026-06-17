import { startTransition, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { CourseMapSummary } from '@/features/course/components/CourseMapSummary';
import { CourseUnitCard } from '@/features/course/components/CourseUnitCard';
import { buildCourseMap, type CourseMapView } from '@/features/course/model';
import { buildLongFormProgressMap } from '@/features/progress';
import {
  listContentAssets,
  listContentSlices,
  listCourseItems,
  listCourseUnits,
  listMediaProgressEvents,
  listProgressEntries,
  listResumePoints,
} from '@/lib/db';

type CoursePageStatus = 'error' | 'loading' | 'ready';

type CoursePageState = {
  courseMap: CourseMapView | null;
  error: string | null;
  status: CoursePageStatus;
};

const initialState: CoursePageState = {
  courseMap: null,
  error: null,
  status: 'loading',
};

export function CoursePage() {
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
        const [
          units,
          items,
          progressEntries,
          contentAssets,
          contentSlices,
          mediaProgressEvents,
          resumePoints,
        ] = await Promise.all([
          listCourseUnits(),
          listCourseItems(),
          listProgressEntries(),
          listContentAssets(),
          listContentSlices(),
          listMediaProgressEvents(),
          listResumePoints(),
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
        );

        startTransition(() => {
          setState({
            courseMap,
            error: null,
            status: 'ready',
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
          });
        });
      }
    }

    void loadCourseMap();

    return () => {
      isActive = false;
    };
  }, [reloadToken]);

  if (state.status === 'loading' || state.courseMap === null) {
    if (state.status === 'error') {
      return (
        <section className="page-section">
          <PageHeader
            description="This route depends only on the seeded local catalog and saved progress records."
            eyebrow="CS50 course map"
            title="Course Map"
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
                Try again
              </button>
            }
            description={state.error ?? 'Unknown local course-map error.'}
            title="Course data could not be read"
          />
        </section>
      );
    }

    return (
      <section className="page-section">
        <PageHeader
          description="The app is reading the seeded course catalog and any saved item-progress records."
          eyebrow="CS50 course map"
          title="Course Map"
        />
        <LoadingState
          description="Opening the local course catalog and assembling ordered progress rollups."
          title="Loading course map"
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
              Back to profile
            </Link>
            <Link className="button button--primary button--md" to="/dashboard">
              Open dashboard
            </Link>
          </div>
        }
        description="The seeded CS50 catalog renders from local persistence. Each item links to a detail screen where you can save status, confidence, notes, evidence, and watched ranges for long-form material."
        eyebrow="CS50 course map"
        meta={
          <>
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
                ? 'Blocked items present'
                : state.courseMap.completionPercent === 100
                  ? 'Course complete'
                  : 'Course in progress'}
            </StatusPill>
          </>
        }
        title="Course Map"
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
