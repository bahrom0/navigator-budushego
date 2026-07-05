import { isPriorityActivityEventType } from "@/types/activity"
import type { ProfileData } from "@/types/profile"

export function createProfileSyncPayload(profile: ProfileData) {
  return {
    sessionId: profile.sessionId,
    plans: profile.plans.map((plan) => ({
      id: plan.id,
      goal_id: plan.goalId ?? null,
      nct_code: plan.nctCode,
      nct_title: plan.nctTitle,
      level: plan.level,
      goals: plan.goals,
      stages: plan.stages,
      completed_steps: plan.completedSteps,
      status: plan.status,
      plan_type: plan.planType ?? "general",
      roadmap_id: plan.roadmapId ?? null,
      updated_at: new Date().toISOString(),
    })),
    bookmarks: profile.bookmarks.map((bookmark) => ({
      nct_code: bookmark.nctCode,
      nct_title: bookmark.nctTitle,
      institution: bookmark.institution,
      city: bookmark.city,
    })),
    deleted_bookmark_codes: profile.deletedBookmarkCodes ?? [],
    achievements: profile.achievements.map((achievement) => ({
      achievement_id: achievement.id,
      title: achievement.title,
      description: achievement.description,
    })),
    interviews: profile.interviews.map((interview) => ({
      id: interview.id,
      goal_id: interview.goalId
        ?? (profile.activeGoal?.nctCode === interview.nctCode ? profile.activeGoal.id : null),
      nct_code: interview.nctCode,
      nct_title: interview.nctTitle,
      questions: interview.questions,
      summary: interview.summary,
      level: interview.level,
    })),
    activityEvents: profile.activityLog.map((event) => {
      const isPriority = typeof event.isPriority === "boolean"
        ? event.isPriority
        : isPriorityActivityEventType(event.type)
      return {
        client_event_id: event.id,
        event_type: event.type,
        label: event.label,
        is_priority: isPriority,
        priority_rank: typeof event.priorityRank === "number"
          ? event.priorityRank
          : (isPriority ? 1 : 0),
        metadata: {},
        occurred_at: new Date(event.timestamp).toISOString(),
      }
    }),
  }
}
