#!/usr/bin/env bash
# Authenticated smoke test for the newly-wired pages (LOCAL dev server only).
# Logs in via NextAuth credentials, then checks each new API + page.
set -u
BASE="http://localhost:3000"
ADMIN_JAR=/tmp/sinai-admin.jar
STU_JAR=/tmp/sinai-stu.jar
EXAM_ID="cmq5malo0000bwqd2oewei7xj"
rm -f "$ADMIN_JAR" "$STU_JAR"

login() {  # jar email pass
  local jar="$1" email="$2" pass="$3"
  local csrf
  csrf=$(curl -s -c "$jar" "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
  curl -s -b "$jar" -c "$jar" -o /dev/null -X POST \
    --data-urlencode "csrfToken=$csrf" \
    --data-urlencode "email=$email" \
    --data-urlencode "password=$pass" \
    --data-urlencode "json=true" \
    "$BASE/api/auth/callback/credentials"
  local role
  role=$(curl -s -b "$jar" "$BASE/api/auth/session" | sed -E 's/.*"role":"([^"]+)".*/\1/')
  echo "  login $email -> role=${role:-NONE}"
}

api() {  # jar method path  -> prints CODE + first 220 chars of body
  local jar="$1" method="$2" path="$3" data="${4:-}"
  local code body
  if [ "$method" = "POST" ]; then
    body=$(curl -s -b "$jar" -w "\n%{http_code}" -H "Content-Type: application/json" -X POST -d "$data" "$BASE$path")
  else
    body=$(curl -s -b "$jar" -w "\n%{http_code}" "$BASE$path")
  fi
  code=$(echo "$body" | tail -1)
  local payload; payload=$(echo "$body" | sed '$d' | tr -d '\n' | cut -c1-220)
  printf "  [%s] %-52s %s\n" "$code" "$path" "$payload"
}

page() {  # jar path
  local jar="$1" path="$2" code
  code=$(curl -s -b "$jar" -o /dev/null -w "%{http_code}" "$BASE$path")
  printf "  [%s] %s\n" "$code" "$path"
}

echo "== logging in =="
login "$ADMIN_JAR" "admin@sainaiinstitute.com" "admin123"
login "$STU_JAR" "demo.student@sinaiinstitute.test" "student123"

echo ""
echo "== staff APIs (admin session) — expect 200 + real data =="
api "$ADMIN_JAR" GET "/api/institute/programs"
api "$ADMIN_JAR" GET "/api/settings?key=institute.tuition"
api "$ADMIN_JAR" GET "/api/cms/dashboard"
api "$ADMIN_JAR" GET "/api/contact-messages"
api "$ADMIN_JAR" GET "/api/institute/finance/collection"
api "$ADMIN_JAR" GET "/api/institute/registration"
api "$ADMIN_JAR" GET "/api/institute/dashboard"
api "$ADMIN_JAR" GET "/api/institute/finance/cfo-dashboard"
api "$ADMIN_JAR" GET "/api/institute/finance/report-builder"
api "$ADMIN_JAR" GET "/api/institute/finance/reports"
api "$ADMIN_JAR" GET "/api/institute/admission/equivalence"
api "$ADMIN_JAR" GET "/api/institute/admission/transfers"
api "$ADMIN_JAR" GET "/api/assistant/dashboard"

echo ""
echo "== exam-take (student session) — GET then POST-submit (grading) =="
api "$STU_JAR" GET "/api/lms/exams/$EXAM_ID/take"

echo ""
echo "== pages — expect 200 (admin for institute/cms, student for exam) =="
for p in /institute/departments/programs /institute/accounting/tuition /cms/dashboard \
         /cms/messages /institute/accounting/collection /institute/admission/registration \
         /institute/dashboard /institute/finance/cfo-dashboard /institute/finance/report-builder \
         /institute/finance/reports /institute/admission/equivalence /institute/admission/transfers \
         /assistant/dashboard; do
  page "$ADMIN_JAR" "$p"
done
page "$STU_JAR" "/lms/exams/take/$EXAM_ID"
