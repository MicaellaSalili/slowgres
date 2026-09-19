# Slowgres Firestore Security Specification

## 1. Data Invariants

1. **User Identity Invariant**: Each user document in `/users/{userId}` can only be read or written by the authenticated user whose `request.auth.uid == userId`.
2. **Subcollection Relational Isolation**: An analysis in `/users/{userId}/analyses/{analysisId}` must strictly belong to `userId`, with `request.auth.uid == userId` and `incoming().userId == userId`.
3. **No Cross-User Access**: Users cannot read, list, update, or delete another user's profile or saved analyses.
4. **Validation Helpers**: Standalone `isValidUserProfile()` and `isValidSavedAnalysis()` functions validate types, required fields, size bounds, and disallow unexpected fields.
5. **No Role Escalation**: Users cannot promote themselves to arbitrary unauthorized roles.
6. **Immutable Fields**: `uid` in `/users/{userId}` and `userId`, `id`, `created_at` in `/users/{userId}/analyses/{analysisId}` cannot be modified on update.

## 2. The Dirty Dozen Payloads (Designed to Fail)

1. **Unauthenticated Profile Read**: Attempting to read `/users/user_abc` without `request.auth`.
2. **Cross-User Profile Read**: User `alice` attempting to read `/users/bob`.
3. **Spoofed User UID on Creation**: User `alice` (`uid: "alice"`) attempting to create `/users/bob` with `uid: "bob"`.
4. **Giant ID Attack**: Attempting to create `/users/{1.5KB_long_id}` to exhaust quota.
5. **Analysis Subcollection Hijack**: User `bob` attempting to create `/users/alice/analyses/rec_123`.
6. **Mismatched Internal User ID**: Creating `/users/alice/analyses/rec_1` with payload `userId: "bob"`.
7. **Malformed Payload (Missing Required Fields)**: Creating `/users/alice/analyses/rec_1` without `analysis_json` or `total_time_ms`.
8. **Negative Time / Invalid Type**: Creating an analysis where `total_time_ms` is negative or a string instead of a number.
9. **Payload Oversize Bomb**: Injecting a 2MB string in `query_text` or `title`.
10. **Immutable Field Tamper**: Updating an existing analysis to change `userId` or `id`.
11. **Shadow Field Injection**: Updating a user document with unauthorized fields like `{"admin": true, "unvetted": "secret"}`.
12. **Cross-User List Scraping**: Querying collection `/users/bob/analyses` as user `alice`.

## 3. Test Runner Concept

A companion `firestore.rules.test.ts` (using `@firebase/rules-unit-testing`) asserting that all 12 dirty payloads yield `PERMISSION_DENIED`.
