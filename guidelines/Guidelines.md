BCBix – Development Guidelines

🧠 Project Overview

BCBix is a production-grade ABA therapy software used by therapists, RBTs, BCBAs, and providers.

This is NOT a demo project.

The system must be:
	•	Scalable
	•	Fast
	•	Clean
	•	Clinically accurate

⸻

⚙️ Tech Stack (Strict)
	•	Next.js (App Router)
	•	TypeScript
	•	Tailwind CSS
	•	shadcn/ui (ONLY UI library)
	•	Zustand (state management)
	•	Supabase (backend)

⸻

🎯 Core Principles
	•	Minimal UI (no clutter)
	•	Compact spacing
	•	Fast interactions (<100ms)
	•	No heavy borders
	•	Clean visual hierarchy
	•	Reusable components

⸻

🧱 Architecture Rules (Critical)
	1.	Separate:
	•	sessions (template)
	•	session_instances (actual occurrence)
	2.	Data must ALWAYS be stored at:
	•	target level (not program level)
	3.	Do NOT tightly couple components
	4.	Always design for:
	•	multiple learners
	•	multiple staff
	•	recurring sessions

⸻

📁 Folder Structure
	•	/src/app → pages and layouts
	•	/src/components → reusable UI components
	•	/src/components/calendar → calendar-specific UI
	•	/src/components/data-entry → take data UI
	•	/src/lib → utilities and services
	•	/src/store → Zustand stores

⸻

🧩 Component Rules
	•	Keep components small and reusable
	•	Avoid large files (>200 lines)
	•	Use composition over duplication
	•	Use shadcn components wherever possible

⸻

🎨 UI Rules
	•	Use Tailwind ONLY
	•	Follow consistent spacing scale
	•	Avoid random colors
	•	Use soft neutral palette
	•	Maintain typography hierarchy:
	•	900 (primary text)
	•	700 (secondary)
	•	500 (muted)

⸻

🗓️ Calendar Rules
	•	Week view first
	•	Horizontal scroll allowed
	•	Show time grid
	•	Support:
	•	drag to create
	•	drag to move
	•	resize duration

⸻

📊 Session States

Each session must have:
	•	Unassigned
	•	Scheduled
	•	In Progress
	•	Documentation Pending
	•	Partially Documented
	•	Completed
	•	Cancelled

States must control:
	•	color
	•	label
	•	icon

⸻

⚡ Take Data Rules (MOST IMPORTANT)
	•	Data is captured at target level ONLY
	•	Each interaction should be 1 tap
	•	Avoid typing as much as possible
	•	UI must be extremely fast and responsive

Supported data types:
	•	Percent Correct
	•	Custom Prompt
	•	Frequency
	•	Duration
	•	Task Analysis
	•	Text Anecdotal
	•	Rate
	•	Partial Interval
	•	Whole Interval
	•	Custom

⸻

🧠 State Management

Use Zustand for:
	•	active session
	•	data collection state
	•	UI state

Avoid unnecessary re-renders

⸻

🧾 Notes System
	•	Support program notes, session notes, supervision notes and ABC notes 
	•	Use templates where possible
	•	Optimize for speed

⸻

🚫 What to Avoid
	•	Do NOT use multiple UI libraries
	•	Do NOT add heavy borders or clutter
	•	Do NOT create tightly coupled components
	•	Do NOT store data at program level

⸻

🧪 Development Workflow
	1.	Build feature in small steps
	2.	Test immediately
	3.	Refactor for reuse
	4.	Optimize UI last

⸻

🧠 AI Usage Rules

When generating code:
	•	Always keep components modular
	•	Follow folder structure strictly
	•	Do not overwrite existing architecture
	•	Maintain consistency with existing UI

⸻

🎯 Goal

Build a system that:
	•	Saves therapist time
	•	Makes data collection fast
	•	Reduces cognitive load
	•	Feels premium and professional