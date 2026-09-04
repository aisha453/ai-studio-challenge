# Gemini Reflections Journal

A secure, user-authenticated personal reflections and journaling web application powered by **Firebase Authentication**, **Cloud Firestore** with strict user-isolation, and the **Gemini 3.6 Flash API**.

---

## Architecture Overview

- **User Identity**: Firebase Authentication with Federated Google Sign-In (zero passwords stored).
- **Database**: Cloud Firestore with owner-bound document isolation (`/users/{userId}/entries/{entryId}`).
- **AI Processing**: Server-side Express proxy invoking Gemini 3.6 Flash with automated 4-model fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`).
- **Secret Management**: Google Cloud Secret Manager / Environment variables for `GEMINI_API_KEY`.
- **Frontend**: React 19 + TypeScript + Tailwind CSS with responsive layout and real-time Firestore sync.

---

## 1. Security Architecture & Threat Model

| Threat Zone | Identified Risk | Countermeasures & Mitigation |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious injection in journal text, oversized payloads, malformed JSON bodies | Strict character caps (10,000 chars), defensive top-level body decoding, and React auto-escaping for safe UI rendering. |
| **Planning & Reasoning** | Prompt injection attempting to alter reflection instructions | Strict system instructions isolating user reflections as passive analysis content; structured output handling. |
| **Tool Execution** | SSRF or unauthorized execution via server-side endpoints | All AI operations routed through isolated `/api/gemini/reflect` backend without dynamic code tools. |
| **Memory & State** | Cross-user data leakage, unauthenticated reads/writes | Strict owner-bound Firestore security rules (`/users/{userId}/**` where `request.auth.uid == userId`); undefined-stripping prior to writes. |
| **Inter-System Communication** | Client-side Gemini API key exposure | API key strictly isolated to server-side runtime (`process.env.GEMINI_API_KEY`); client authenticates with Firebase ID tokens. |

---

## 2. Cloud Firestore Security Rules

Deploy the following rules to Cloud Firestore to enforce strict, zero-trust user data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile and private subcollections: strictly user-isolated
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 3. Secret Manager Setup (Google Cloud)

Store the `GEMINI_API_KEY` securely in Google Cloud Secret Manager and grant access to the Cloud Run runtime service account:

```bash
# 1. Enable Secret Manager and Cloud Run APIs
gcloud services enable secretmanager.googleapis.com run.googleapis.com firestore.googleapis.com

# 2. Create the Secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 3. Add the secret version with your Gemini API key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 4. Grant Secret Manager Secret Accessor role to the Cloud Run service account
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Google Cloud Run Deployment

Build and deploy the application container to Cloud Run:

```bash
# Build and deploy service
gcloud run deploy gemini-reflections-journal \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars NODE_ENV=production

# Apply the required campaign verification label
gcloud run services update gemini-reflections-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 5. End-to-End Functional Test Scenarios

Below are step-by-step test cases covering all user interactions and workflows:

### Test Case 1: Unauthenticated Landing & Google Sign-In
- **Initial State**: User opens the app URL while unauthenticated.
- **Action**: Verify the Landing Page renders with security details and the "Sign in with Google" button.
- **Trigger**: Click `Sign in with Google` (`#google-signin-btn`).
- **Expected Result**: Firebase Google Auth popup opens. Upon selecting a valid Google account, the user is authenticated, the landing page transitions to the private dashboard, and the user's name and avatar appear in the Navbar.

### Test Case 2: Writing & Submitting a First Reflection
- **Initial State**: User is authenticated on an empty or newly created journal entry (`Untitled Reflection`).
- **Action**: Select the `Deep Reflection` mode button (`#mode-btn-reflect`).
- **Trigger**: Enter text into the textarea (`#reflection-textarea`) (e.g., *"Feeling overwhelmed by competing priorities at work"*) and click `Send to Gemini` (`#submit-reflection-btn`) or press `Enter`.
- **Expected Result**:
  1. The user's input immediately appears as a user message bubble.
  2. The status indicator displays `Saving to Firestore...` then `Saved in isolated Firestore`.
  3. A loading indicator with animated pulse appears (`Reflecting with Gemini 3.6 Flash...`).
  4. The Gemini response appears formatted in Markdown with empathetic guidance and inquiry questions.
  5. The entry title updates automatically from `Untitled Reflection` to a meaningful title.
  6. The entry appears in the History Sidebar.

### Test Case 3: Mode Switching (Summarize, Brainstorm, Action Items)
- **Initial State**: User is within an existing reflection thread.
- **Action**: Switch reflection mode by clicking `Summary & Themes` (`#mode-btn-summarize`).
- **Trigger**: Enter *"Can you summarize our discussion into core takeaways?"* and send.
- **Expected Result**: Gemini returns structured bullet points synthesizing the reflection. The message card displays the `summarize` tag badge.

### Test Case 4: Real-Time History & Multi-Turn Continuation
- **Initial State**: History sidebar lists one or more reflections.
- **Action**: Click on a previous entry item in the History Sidebar (`#entry-item-<id>`).
- **Trigger**: The editor loads the selected entry's full multi-turn conversation.
- **Action**: Submit a new question or reflection.
- **Expected Result**: The new turn is appended, the timestamp updates, and the updated entry moves to the top of the history list.

### Test Case 5: Entry Renaming & Star/Favorite Toggle
- **Action 1**: Click the entry title heading (`#entry-title-heading`), modify the text, and press `Enter`.
- **Expected Result 1**: The title is updated in the editor and immediately updates in the History Sidebar.
- **Action 2**: Click the Star button (`#star-entry-btn`).
- **Expected Result 2**: The star fills with amber color. Toggling the "Favorites" filter in the sidebar shows only starred reflections.

### Test Case 6: Entry Deletion with Confirmation
- **Initial State**: At least one entry exists in the History Sidebar.
- **Trigger**: Hover over an entry and click the Delete icon (`#delete-entry-btn-<id>`).
- **Confirmation**: Confirm the browser dialog prompt.
- **Expected Result**: The document is deleted from Firestore `/users/{uid}/entries/{id}`. If it was active, a blank or adjacent entry is loaded.

### Test Case 7: Sign Out & Privacy Boundary
- **Trigger**: Click the Sign Out button in the Navbar (`#sign-out-btn`).
- **Expected Result**: Authentication session is terminated via Firebase Auth. The workspace immediately unmounts, and the landing page is displayed. Signing in with a different Google account verifies that past entries from the first account are completely inaccessible.
