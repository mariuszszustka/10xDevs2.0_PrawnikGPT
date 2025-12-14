# Testing Implementation Checklist

## ✅ Setup Complete

- [x] Installed Vitest and dependencies
- [x] Installed Playwright and dependencies
- [x] Created vitest.config.ts
- [x] Created playwright.config.ts
- [x] Created test setup files
- [x] Created directory structure (src/__tests__, e2e/, e2e/page-objects/)
- [x] Added test scripts to package.json
- [x] Created example tests
- [x] Created Page Objects (BasePage, LoginPage, ChatPage)
- [x] Updated .gitignore for test artifacts
- [x] Created documentation (TESTING_SETUP.md, TESTING_QUICKSTART.md)

## 🚧 TODO: Add data-testid Attributes

### Priority: HIGH (Required for E2E tests)

#### Authentication Components
- [ ] `src/components/auth/LoginForm.tsx`
  - [ ] email input: `data-testid="login-email-input"`
  - [ ] password input: `data-testid="login-password-input"`
  - [ ] submit button: `data-testid="login-submit-button"`
  - [ ] error message: `data-testid="login-error-message"`
  - [ ] forgot password link: `data-testid="forgot-password-link"`
  - [ ] register link: `data-testid="register-link"`

- [ ] `src/components/auth/RegisterForm.tsx`
  - [ ] email input: `data-testid="register-email-input"`
  - [ ] password input: `data-testid="register-password-input"`
  - [ ] confirm password input: `data-testid="register-confirm-password-input"`
  - [ ] submit button: `data-testid="register-submit-button"`
  - [ ] error message: `data-testid="register-error-message"`

- [ ] `src/components/auth/SignupForm.tsx`
  - [ ] Similar structure to RegisterForm

#### Chat Components
- [ ] `src/components/chat/ChatInput.tsx`
  - [ ] textarea: `data-testid="chat-input"`
  - [ ] send button: `data-testid="chat-send-button"`

- [ ] `src/components/chat/ChatMessagesContainer.tsx`
  - [ ] messages container: `data-testid="chat-messages-container"`
  - [ ] loading indicator: `data-testid="chat-loading"`

- [ ] `src/components/chat/WelcomeMessage.astro`
  - [ ] welcome message: `data-testid="welcome-message"`

- [ ] `src/components/chat/ExampleQuestions.astro`
  - [ ] container: `data-testid="example-questions"`

- [ ] `src/components/chat/ResponseCard.tsx`
  - [ ] fast response card: `data-testid="fast-response-card"`
  - [ ] accurate response card: `data-testid="accurate-response-card"`

- [ ] `src/components/chat/DetailedAnswerModal.tsx`
  - [ ] accurate response button: `data-testid="accurate-response-button"`
  - [ ] modal: `data-testid="accurate-response-modal"`

- [ ] `src/components/chat/RatingButtons.tsx`
  - [ ] thumbs up: `data-testid="rating-thumbs-up"`
  - [ ] thumbs down: `data-testid="rating-thumbs-down"`

#### Layout Components
- [ ] `src/components/layout/UserMenu.tsx`
  - [ ] user menu button: `data-testid="user-menu"`
  - [ ] logout button: `data-testid="logout-button"`

#### History Components
- [ ] `src/components/history/HistoryList.tsx`
  - [ ] history list: `data-testid="history-list"`
  - [ ] load more button: `data-testid="load-more-button"`

- [ ] `src/components/history/QueryCard.tsx`
  - [ ] query card: `data-testid="query-card"`
  - [ ] delete button: `data-testid="delete-query-button"`

## 🚧 TODO: Write Unit Tests

### Priority: HIGH

- [ ] **Auth Components**
  - [ ] `src/components/auth/LoginForm.test.tsx`
    - [ ] Renders form fields
    - [ ] Validates email format
    - [ ] Validates password length
    - [ ] Calls onSubmit with correct data
    - [ ] Displays error messages

  - [ ] `src/components/auth/RegisterForm.test.tsx`
    - [ ] Validates password confirmation match
    - [ ] Shows password strength indicator
    - [ ] Handles registration errors

- [ ] **Chat Components**
  - [ ] `src/components/chat/ChatInput.test.tsx`
    - [ ] Validates query length (10-1000 chars)
    - [ ] Disables send button for invalid input
    - [ ] Calls onSubmit on Enter key

  - [ ] `src/components/chat/RatingButtons.test.tsx`
    - [ ] Calls onRate with correct value
    - [ ] Shows active state when rated
    - [ ] Allows changing rating

- [ ] **Utility Functions**
  - [ ] `src/lib/apiClient.test.ts`
    - [ ] Handles successful requests
    - [ ] Handles network errors
    - [ ] Includes auth headers

### Priority: MEDIUM

- [ ] **History Components**
  - [ ] `src/components/history/HistoryList.test.tsx`
  - [ ] `src/components/history/QueryCard.test.tsx`

- [ ] **Layout Components**
  - [ ] `src/components/layout/UserMenu.test.tsx`

## 🚧 TODO: Write E2E Tests

### Priority: HIGH

- [ ] **Authentication Flow** (`e2e/auth.spec.ts`) - ✅ Partially done
  - [x] Login page visibility
  - [x] Invalid credentials error
  - [x] Successful login redirect
  - [ ] Logout flow
  - [ ] Session persistence

- [ ] **Chat Flow** (`e2e/chat.spec.ts`)
  - [ ] Send query and receive fast response
  - [ ] Request accurate response
  - [ ] Rate response (thumbs up/down)
  - [ ] Click example question
  - [ ] Validation errors for short/long queries

### Priority: MEDIUM

- [ ] **History Flow** (`e2e/history.spec.ts`)
  - [ ] View query history
  - [ ] Pagination (load more)
  - [ ] Delete query
  - [ ] Empty state

- [ ] **Registration Flow** (`e2e/register.spec.ts`)
  - [ ] Register new user
  - [ ] Email validation
  - [ ] Password strength validation
  - [ ] Duplicate email error

### Priority: LOW

- [ ] **Onboarding** (`e2e/onboarding.spec.ts`)
  - [ ] Welcome message visibility
  - [ ] Example questions functionality

## 🚧 TODO: Setup CI/CD

- [ ] Create `.github/workflows/test.yml`
  - [ ] Run unit tests on PR
  - [ ] Run E2E tests on PR
  - [ ] Check coverage thresholds
  - [ ] Block merge if tests fail

## 📊 Coverage Targets

### Current Status
- Frontend: **0%** (no tests yet)
- Backend: **TBD** (run `cd backend && pytest --cov`)

### MVP Targets
- Frontend: **≥50%**
- Backend: **≥70%**

## 🎯 Weekly Goals

### Week 1
- [ ] Add data-testid to all auth components
- [ ] Write unit tests for LoginForm
- [ ] Write unit tests for RegisterForm
- [ ] Write E2E test for complete auth flow

### Week 2
- [ ] Add data-testid to all chat components
- [ ] Write unit tests for ChatInput
- [ ] Write unit tests for RatingButtons
- [ ] Write E2E test for chat flow

### Week 3
- [ ] Add data-testid to history components
- [ ] Write unit tests for HistoryList
- [ ] Write E2E test for history flow
- [ ] Reach ≥30% frontend coverage

### Week 4
- [ ] Add remaining unit tests
- [ ] Add remaining E2E tests
- [ ] Setup CI/CD pipeline
- [ ] Reach ≥50% frontend coverage ✅

## 📝 Notes

- **Visual Regression**: Consider adding screenshot tests for critical pages
- **Accessibility**: Run axe accessibility tests on all major components
- **Performance**: Monitor bundle size impact of test dependencies
- **Backend Tests**: Backend tests (pytest) are separate - see `backend/tests/`

## 🔗 Resources

- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
