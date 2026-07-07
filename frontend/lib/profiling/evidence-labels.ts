/** Student-facing labels for observation and signal catalog ids. */

const OBSERVATION_TYPE_LABELS: Record<string, string> = {
  mentorship_session_lifecycle: "Mentoring Session",
  mentorship_session_cadence: "Session Attendance",
  mentorship_note_event: "Learning Note",
  mentorship_message_event: "Message with Mentor",
  mentorship_task_event: "Mentor Task",
  mentor_role_assigned: "Mentor Assignment",
  mentorship_session_notes_posted: "Session Notes",
  mentorship_help_request: "Help Request",
  projex_comment_posted: "Project Comment",
  projex_milestone_defined: "Milestone Planned",
  projex_task_event: "Project Task",
  projex_role_assigned: "Project Role",
  projex_contribution_counted: "Team Contribution",
  projex_milestone_submitted: "Milestone Submitted",
  projex_task_self_claimed: "Task Claimed",
  placement_application_submitted: "Job Application",
  placement_experience_added: "Work Experience",
  placement_project_added: "Portfolio Project",
  placement_profile_field_updated: "Profile Update",
  placement_certificate_added: "Certificate Added",
  placement_interview_scheduled: "Interview Scheduled",
  placement_offer_received: "Job Offer",
  placement_application_recruiter_responded: "Recruiter Response",
  placement_skill_declared: "Skill Added",
  placement_profile_completeness_updated: "Profile Progress",
  placement_job_viewed: "Job Viewed",
  placement_job_saved: "Saved Job",
  placement_skill_endorsed: "Skill Endorsement",
}

const OBSERVATION_TYPE_PLURALS: Record<string, string> = {
  mentorship_session_lifecycle: "Mentoring Sessions",
  mentorship_session_cadence: "Session Attendance Checks",
  mentorship_note_event: "Learning Notes",
  mentorship_message_event: "Messages with Mentor",
  mentorship_task_event: "Mentor Tasks",
  mentor_role_assigned: "Mentor Assignments",
  mentorship_session_notes_posted: "Session Notes",
  mentorship_help_request: "Help Requests",
  projex_comment_posted: "Project Comments",
  projex_milestone_defined: "Milestones Planned",
  projex_task_event: "Project Tasks",
  projex_role_assigned: "Project Roles",
  projex_contribution_counted: "Team Contributions",
  projex_milestone_submitted: "Milestones Submitted",
  projex_task_self_claimed: "Tasks Claimed",
  placement_application_submitted: "Job Applications",
  placement_experience_added: "Work Experiences",
  placement_project_added: "Portfolio Projects",
  placement_profile_field_updated: "Profile Updates",
  placement_certificate_added: "Certificates Added",
  placement_interview_scheduled: "Interviews Scheduled",
  placement_offer_received: "Job Offers",
  placement_application_recruiter_responded: "Recruiter Responses",
  placement_skill_declared: "Skills Added",
  placement_profile_completeness_updated: "Profile Updates",
  placement_job_viewed: "Jobs Viewed",
  placement_job_saved: "Saved Jobs",
  placement_skill_endorsed: "Skill Endorsements",
}

export const SIGNAL_TYPE_LABELS: Record<string, string> = {
  cadence_compliance_rate: "Regular session attendance",
  task_completion_rate: "Mentor tasks completed",
  milestone_definition_rate: "Self-planned milestones",
  application_rate: "Job applications submitted",
  stretch_milestone_rate: "Stretch milestones",
  project_add_rate: "Portfolio projects added",
  experience_add_rate: "Work experiences added",
  message_rate: "Messages with mentor",
  comment_rate: "Project comments",
  session_attendance_rate: "Mentoring sessions attended",
  co_activity_rate: "Mentorship engagement",
  help_seeking_latency: "Asking for help promptly",
  help_request_rate: "Help requests",
  note_activity_rate: "Learning notes",
  session_activity_rate: "Session activity",
  session_notes_rate: "Session notes",
  mentor_role_assignment_rate: "Mentor relationships",
  projex_task_activity_rate: "Project task activity",
  projex_role_change_rate: "Project role changes",
  contribution_snapshot_rate: "Team contributions",
  contribution_tasks_completed: "Tasks completed",
  contribution_comments_posted: "Comments posted",
  milestone_submission_lead_days: "Early milestone submissions",
  milestone_submission_rate: "Milestones submitted",
  projex_self_claim_rate: "Tasks self-claimed",
  profile_update_rate: "Profile updates",
  profile_completeness_snapshot: "Profile completeness",
  profile_completeness_trend: "Profile growth",
  certificate_add_rate: "Certificates earned",
  interview_schedule_rate: "Interviews scheduled",
  offer_received_rate: "Offers received",
  recruiter_response_rate: "Recruiter responses",
  skill_declaration_rate: "Skills declared",
  job_view_rate: "Jobs explored",
  job_save_rate: "Jobs saved",
  skill_endorsement_rate: "Skill endorsements",
}

function fallbackLabel(id: string): string {
  return id
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function formatObservationTypeLabel(observationType: string): string {
  return OBSERVATION_TYPE_LABELS[observationType] ?? fallbackLabel(observationType)
}

export function formatObservationTypePlural(observationType: string, count: number): string {
  if (count === 1) {
    return `1 ${formatObservationTypeLabel(observationType)}`
  }
  const plural = OBSERVATION_TYPE_PLURALS[observationType]
  return plural ? `${count} ${plural}` : `${count} ${fallbackLabel(observationType)}s`
}

export function formatSignalTypeLabel(signalType: string): string {
  return SIGNAL_TYPE_LABELS[signalType] ?? fallbackLabel(signalType)
}

function formatEventPhrase(value: string): string {
  return value
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function fieldString(fields: Record<string, unknown>, key: string): string | undefined {
  const value = fields[key]
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined
}

function fieldBool(fields: Record<string, unknown>, key: string): boolean | undefined {
  const value = fields[key]
  return typeof value === "boolean" ? value : undefined
}

function fieldNumber(fields: Record<string, unknown>, key: string): number | undefined {
  const value = fields[key]
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function joinDetails(...parts: Array<string | undefined>): string | undefined {
  const filtered = parts.filter((part): part is string => Boolean(part))
  return filtered.length > 0 ? filtered.join(" · ") : undefined
}

function formatShortDate(value?: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatStatusTransition(from?: string, to?: string): string | undefined {
  if (from && to && from !== to) {
    return `${formatEventPhrase(from)} → ${formatEventPhrase(to)}`
  }
  if (to) return formatEventPhrase(to)
  if (from) return formatEventPhrase(from)
  return undefined
}

/** Short secondary line for a canonical observation (status, dates, context). */
export function observationItemDetail(
  observationType: string,
  fields: Record<string, unknown>,
  payload?: Record<string, unknown>
): string | undefined {
  switch (observationType) {
    case "mentorship_task_event":
      return joinDetails(
        fieldString(fields, "task_event")
          ? formatEventPhrase(fieldString(fields, "task_event")!)
          : undefined,
        fieldString(fields, "task_status")
          ? `Status: ${formatEventPhrase(fieldString(fields, "task_status")!)}`
          : undefined
      )
    case "projex_task_event":
      return joinDetails(
        formatStatusTransition(
          fieldString(fields, "from_status"),
          fieldString(fields, "to_status")
        ) ??
          (fieldString(fields, "task_event")
            ? formatEventPhrase(fieldString(fields, "task_event")!)
            : undefined),
        fieldString(fields, "task_status")
          ? `Status: ${formatEventPhrase(fieldString(fields, "task_status")!)}`
          : undefined
      )
    case "mentorship_session_lifecycle":
      return joinDetails(
        fieldString(fields, "session_mode")
          ? formatEventPhrase(fieldString(fields, "session_mode")!)
          : undefined,
        formatShortDate(fieldString(fields, "scheduled_start_at"))
          ? `Scheduled ${formatShortDate(fieldString(fields, "scheduled_start_at")!)}`
          : undefined
      )
    case "mentorship_session_cadence": {
      const compliant = fieldBool(fields, "is_compliant")
      return joinDetails(
        compliant === undefined
          ? undefined
          : compliant
            ? "On track with session cadence"
            : "Below expected session cadence",
        fieldString(fields, "frequency")
          ? `${formatEventPhrase(fieldString(fields, "frequency")!)} check-ins`
          : undefined
      )
    }
    case "mentorship_note_event":
      return fieldString(fields, "note_event")
        ? formatEventPhrase(fieldString(fields, "note_event")!)
        : undefined
    case "mentorship_message_event":
      return joinDetails(
        fieldBool(fields, "is_group") ? "Group message" : "Direct message",
        formatShortDate(fieldString(fields, "message_sent_at"))
          ? `Sent ${formatShortDate(fieldString(fields, "message_sent_at")!)}`
          : undefined
      )
    case "mentor_role_assigned":
      return fieldString(fields, "mentor_name")
        ? "New mentor relationship started"
        : "Mentor assigned to your profile"
    case "mentorship_session_notes_posted":
      return "Notes added after a mentoring session"
    case "mentorship_help_request":
      return joinDetails(
        formatShortDate(fieldString(fields, "session_booked_at"))
          ? `Help session booked ${formatShortDate(fieldString(fields, "session_booked_at")!)}`
          : undefined,
        formatShortDate(fieldString(fields, "struggle_detected_at"))
          ? `Support flagged ${formatShortDate(fieldString(fields, "struggle_detected_at")!)}`
          : undefined
      )
    case "projex_comment_posted":
      return fieldString(fields, "task_status")
        ? `On task in ${formatEventPhrase(fieldString(fields, "task_status")!)}`
        : "Feedback shared on a project task"
    case "projex_milestone_defined":
      return joinDetails(
        fieldString(fields, "submission_type")
          ? formatEventPhrase(fieldString(fields, "submission_type")!)
          : undefined,
        formatShortDate(fieldString(fields, "milestone_end_date"))
          ? `Due ${formatShortDate(fieldString(fields, "milestone_end_date")!)}`
          : undefined
      )
    case "projex_milestone_submitted": {
      const submitted = fieldString(fields, "submitted_at")
      const due = fieldString(fields, "due_at")
      if (submitted && due) {
        const early = new Date(submitted).getTime() <= new Date(due).getTime()
        return joinDetails(
          formatShortDate(submitted)
            ? `Submitted ${formatShortDate(submitted)!}`
            : undefined,
          early ? "On time" : "After due date"
        )
      }
      return formatShortDate(submitted)
        ? `Submitted ${formatShortDate(submitted)!}`
        : undefined
    }
    case "projex_task_self_claimed":
      return joinDetails(
        "You claimed ownership of this task",
        formatShortDate(fieldString(fields, "claimed_at"))
          ? formatShortDate(fieldString(fields, "claimed_at")!)
          : undefined
      )
    case "projex_role_assigned":
      return joinDetails(
        fieldString(fields, "new_role")
          ? `Role: ${formatEventPhrase(fieldString(fields, "new_role")!)}`
          : undefined,
        formatStatusTransition(
          fieldString(fields, "previous_role"),
          fieldString(fields, "new_role")
        )
      )
    case "projex_contribution_counted":
      return joinDetails(
        fieldNumber(fields, "tasks_completed") !== undefined
          ? `${fieldNumber(fields, "tasks_completed")} tasks completed`
          : undefined,
        fieldNumber(fields, "comments_posted") !== undefined
          ? `${fieldNumber(fields, "comments_posted")} comments posted`
          : undefined
      )
    case "placement_application_submitted":
      return joinDetails(
        fieldString(fields, "application_status")
          ? `Status: ${formatEventPhrase(fieldString(fields, "application_status")!)}`
          : undefined,
        formatShortDate(fieldString(fields, "submitted_at"))
          ? `Applied ${formatShortDate(fieldString(fields, "submitted_at")!)}`
          : undefined,
        payload
          ? (fieldString(payload, "company_name") ?? fieldString(payload, "company"))
          : undefined
      )
    case "placement_experience_added":
      return joinDetails(
        fieldString(fields, "experience_type")
          ? formatEventPhrase(fieldString(fields, "experience_type")!)
          : undefined,
        fieldBool(fields, "is_ongoing") ? "Currently ongoing" : undefined,
        formatShortDate(fieldString(fields, "start_date"))
      )
    case "placement_project_added":
      return joinDetails(
        fieldString(fields, "source")
          ? `Added via ${formatEventPhrase(fieldString(fields, "source")!)}`
          : undefined,
        fieldBool(fields, "is_ongoing") ? "Ongoing project" : undefined
      )
    case "placement_certificate_added":
      return fieldString(fields, "source")
        ? `Issued by ${formatEventPhrase(fieldString(fields, "source")!)}`
        : undefined
    case "placement_profile_field_updated":
      return joinDetails(
        fieldString(fields, "changed_title") ? "Updated headline" : undefined,
        fieldString(fields, "changed_description") ? "Updated summary" : undefined,
        fieldString(fields, "profile_video_url") ? "Added profile video" : undefined
      )
    case "placement_interview_scheduled":
      return fieldString(fields, "stage_title")
        ? `Stage: ${formatEventPhrase(fieldString(fields, "stage_title")!)}`
        : "Interview round scheduled"
    case "placement_offer_received":
      return fieldString(fields, "offer_status")
        ? `Offer status: ${formatEventPhrase(fieldString(fields, "offer_status")!)}`
        : undefined
    case "placement_application_recruiter_responded":
      return formatStatusTransition(
        fieldString(fields, "previous_status"),
        fieldString(fields, "new_status")
      )
    case "placement_skill_declared":
      return fieldString(fields, "skill_value")
        ? `Proficiency: ${formatEventPhrase(fieldString(fields, "skill_value")!)}`
        : "Added to your skills profile"
    case "placement_skill_endorsed":
      return "Skill endorsed on your profile"
    case "placement_profile_completeness_updated": {
      const pct = fieldNumber(fields, "completeness_percent")
      return pct !== undefined ? `Profile ${Math.round(pct)}% complete` : undefined
    }
    case "placement_job_viewed":
      return formatShortDate(fieldString(fields, "viewed_at"))
        ? `Viewed ${formatShortDate(fieldString(fields, "viewed_at")!)}`
        : "Explored a job posting"
    case "placement_job_saved":
      return formatShortDate(fieldString(fields, "saved_at"))
        ? `Saved ${formatShortDate(fieldString(fields, "saved_at")!)}`
        : "Saved for later"
    default:
      return undefined
  }
}

/** Best-effort title for a single canonical observation row. */
export function observationItemText(
  observationType: string,
  fields: Record<string, unknown>,
  payload?: Record<string, unknown>
): string {
  const payloadTitle = payload ? fieldString(payload, "title") : undefined
  if (payloadTitle) return payloadTitle

  const directTitle = fieldString(fields, "title")
  if (directTitle) return directTitle

  switch (observationType) {
    case "mentorship_task_event": {
      const taskTitle = fieldString(fields, "task_title")
      if (taskTitle) return taskTitle
      const taskEvent = fieldString(fields, "task_event")
      if (taskEvent) return formatEventPhrase(taskEvent)
      break
    }
    case "projex_task_event": {
      const taskTitle = fieldString(fields, "task_title")
      if (taskTitle) return taskTitle
      const taskEvent = fieldString(fields, "task_event")
      if (taskEvent) return formatEventPhrase(taskEvent)
      break
    }
    case "mentorship_session_lifecycle": {
      const sessionEvent = fieldString(fields, "session_event")
      const sessionStatus = fieldString(fields, "session_status")
      if (sessionEvent && sessionStatus) {
        return `${formatEventPhrase(sessionEvent)} (${formatEventPhrase(sessionStatus)})`
      }
      if (sessionEvent) return formatEventPhrase(sessionEvent)
      if (sessionStatus) return formatEventPhrase(sessionStatus)
      break
    }
    case "mentorship_note_event":
      return fieldString(fields, "note_title") ?? formatObservationTypeLabel(observationType)
    case "mentorship_message_event":
      return fieldString(fields, "message_sent_at")
        ? `Message on ${new Date(fieldString(fields, "message_sent_at")!).toLocaleDateString()}`
        : formatObservationTypeLabel(observationType)
    case "mentor_role_assigned":
      return fieldString(fields, "mentor_name")
        ? `Mentor: ${fieldString(fields, "mentor_name")}`
        : formatObservationTypeLabel(observationType)
    case "placement_project_added":
      return fieldString(fields, "project_title") ?? formatObservationTypeLabel(observationType)
    case "placement_experience_added":
      return fieldString(fields, "experience_title") ?? formatObservationTypeLabel(observationType)
    case "placement_certificate_added":
      return fieldString(fields, "certificate_name") ?? formatObservationTypeLabel(observationType)
    case "placement_application_submitted":
      return fieldString(fields, "job_title") ?? formatObservationTypeLabel(observationType)
    case "placement_interview_scheduled":
      return fieldString(fields, "job_title")
        ? `Interview for ${fieldString(fields, "job_title")}`
        : formatObservationTypeLabel(observationType)
    case "placement_offer_received":
      return fieldString(fields, "job_title")
        ? `Offer for ${fieldString(fields, "job_title")}`
        : formatObservationTypeLabel(observationType)
    case "projex_milestone_defined":
    case "projex_milestone_submitted":
      return fieldString(fields, "milestone_title") ?? formatObservationTypeLabel(observationType)
    default:
      break
  }

  return formatObservationTypeLabel(observationType)
}
