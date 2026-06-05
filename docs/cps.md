# Canonical Profile Schema (CPS)

## Purpose

The Canonical Profile Schema (CPS) defines the standard structure that all learner data within the platform must follow.

Educational institutions use different systems and naming conventions to store learner information.

Examples:

Institution A

```json
{
  "student_name": "Neeraj Gowda"
}
```

Institution B

```json
{
  "full_name": "Neeraj Gowda"
}
```

Institution C

```json
{
  "name": "Neeraj Gowda"
}
```

Although the field names differ, they represent the same information.

The purpose of CPS is to provide a single standardized structure into which all external systems can be mapped.

All connectors, workflows, AI mapping, and profile generation processes ultimately target this schema.

---

# Profile Structure

The learner profile is divided into nine domains.

```text
Learner Profile

├── Identity
├── Education
├── Attendance
├── Assessments
├── Payments
├── Skills
├── Certifications
├── Projects
└── Placement
```

---

# 1. Identity Domain

Stores the core identity of a learner.

```json
{
  "learner_id": "",
  "institution_id": "",

  "full_name": "",
  "first_name": "",
  "last_name": "",

  "email": "",
  "phone": "",

  "gender": "",
  "date_of_birth": "",

  "nationality": "",

  "profile_photo_url": ""
}
```

---

# 2. Education Domain

Stores academic information.

```json
{
  "program": "",
  "degree": "",
  "specialization": "",

  "department": "",

  "batch": "",

  "current_year": "",

  "roll_number": "",

  "admission_date": "",

  "graduation_date": "",

  "cgpa": "",

  "academic_status": ""
}
```

### Academic Status Values

* Active
* Graduated
* Dropped
* On Hold

---

# 3. Attendance Domain

Stores attendance metrics.

```json
{
  "attendance_percentage": 0,

  "classes_attended": 0,

  "classes_conducted": 0,

  "last_attendance_date": ""
}
```

---

# 4. Assessment Domain

Stores assessments completed by a learner.

A learner can have multiple assessments.

```json
{
  "assessment_id": "",

  "assessment_name": "",

  "assessment_type": "",

  "score": 0,

  "max_score": 0,

  "percentage": 0,

  "attempt_date": "",

  "status": ""
}
```

### Assessment Types

* Quiz
* Assignment
* Internal
* External
* Mock Test
* Coding Test

---

# 5. Payment Domain

Stores payment information.

A learner can have multiple payment records.

```json
{
  "payment_id": "",

  "payment_type": "",

  "amount": 0,

  "currency": "",

  "status": "",

  "due_date": "",

  "payment_date": ""
}
```

### Payment Status Values

* Paid
* Pending
* Overdue
* Partial

---

# 6. Skill Domain

Stores learner skills.

```json
{
  "skill_name": "",

  "category": "",

  "proficiency": ""
}
```

### Proficiency Levels

* Beginner
* Intermediate
* Advanced

---

# 7. Certification Domain

Stores certifications earned by a learner.

```json
{
  "certificate_name": "",

  "issuer": "",

  "issued_date": "",

  "expiry_date": "",

  "certificate_url": ""
}
```

---

# 8. Project Domain

Stores learner projects.

```json
{
  "project_name": "",

  "description": "",

  "role": "",

  "tech_stack": [],

  "start_date": "",

  "end_date": ""
}
```

---

# 9. Placement Domain

Stores placement and career outcomes.

```json
{
  "placement_status": "",

  "company_name": "",

  "job_role": "",

  "package": "",

  "joining_date": ""
}
```

### Placement Status Values

* Placed
* Interviewing
* Not Placed
* Offer Received

---

# Master Profile Structure

The complete learner profile is represented as:

```json
{
  "identity": {},
  "education": {},
  "attendance": {},
  "assessments": [],
  "payments": [],
  "skills": [],
  "certifications": [],
  "projects": [],
  "placement": {}
}
```

---

# Mapping Strategy

All incoming data from external systems must be mapped into one of the CPS domains.

Example:

Source System

```json
{
  "student_name": "Neeraj Gowda",
  "cgpa": 8.7,
  "attendance": 92
}
```

Mapped To

```json
{
  "identity": {
    "full_name": "Neeraj Gowda"
  },
  "education": {
    "cgpa": 8.7
  },
  "attendance": {
    "attendance_percentage": 92
  }
}
```

---

# AI Mapping Responsibility

The AI Data Analyst layer is responsible for:

* Understanding source schemas
* Identifying learner-related fields
* Suggesting mappings into CPS
* Generating confidence scores
* Assisting administrators during onboarding

The AI never modifies production data directly.

All mappings require validation and approval.

---

# Why CPS Exists

Benefits:

* Standardized learner representation
* Consistent profile generation
* Simplified connector development
* Simplified AI mapping
* Easier analytics and reporting
* Institution-independent learner profiles

CPS acts as the contract between external systems and the Learner Intelligence Platform.
