---
type: "query"
date: "2026-08-11T03:57:52.595765+00:00"
question: "what the report schedules actually matter? can we remove it"
contributor: "graphify"
outcome: "useful"
source_nodes: ["ReportSchedulesPage()", ".processDueReportSchedules()", ".reportCsv()", ".runReport()"]
---

# Q: what the report schedules actually matter? can we remove it

## Answer

Expanded from original query via vocab: [report, reports, schedule, schedules, scheduled, email, cron, jobs]. Report schedules are automatic report delivery: ScheduledJobsService.processDueReportSchedules() runs due reports with ReportsService.runReport(), converts them to CSV, and emails them. The frontend ReportSchedulesPage configures the feature. It can be removed if automatic emailed reports are not needed, but removal must include the page/routes/API, scheduled-job processing, and stored schedules; hiding the page alone would not stop emails.

## Outcome

- Signal: useful

## Source Nodes

- ReportSchedulesPage()
- .processDueReportSchedules()
- .reportCsv()
- .runReport()