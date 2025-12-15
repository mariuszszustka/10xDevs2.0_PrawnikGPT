/**
 * POM Index - Central export for all Page Object Models
 *
 * Import POMs using:
 * import { LoginPage, ChatPage, HeaderComponent } from '@/tests/pom';
 */

// Pages
export { BasePage } from './pages/BasePage';
export { LoginPage } from './pages/LoginPage';
export { ChatPage } from './pages/ChatPage';

// Components
export { HeaderComponent } from './components/HeaderComponent';

// Types
export type { ResponseType, RatingValue } from './pages/ChatPage';
