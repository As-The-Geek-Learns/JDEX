/**
 * FeedbackSettings Component Tests
 * =================================
 * Tests for the feedback submission settings component
 *
 * Categories:
 * - Rendering: Header, type cards, default selection, textarea
 * - Type Selection: Highlight, click updates, placeholder changes
 * - Message Input: State update, character count, truncation
 * - Email Submission: Disabled when empty, mailto URL, window.open, success state
 * - Copy Email: Clipboard API, feedback
 * - Design Tip: Only shown for design type
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackSettings from './FeedbackSettings';

// =============================================================================
// Mock Setup
// =============================================================================

const mockWindowOpen = vi.fn();
const mockClipboardWriteText = vi.fn().mockResolvedValue(undefined);

// Store original clipboard
const originalClipboard = navigator.clipboard;

beforeEach(() => {
  vi.clearAllMocks();

  // Mock window.open
  vi.spyOn(window, 'open').mockImplementation(mockWindowOpen);

  // Mock clipboard - need to delete first then define
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockClipboardWriteText },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  // Restore original clipboard if it existed
  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  }
});

// =============================================================================
// Rendering Tests
// =============================================================================

describe('FeedbackSettings Rendering', () => {
  it('renders header with title and description', () => {
    render(<FeedbackSettings />);

    // Use level 2 to get the main heading specifically
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Feedback');
    expect(screen.getByText(/Help us improve JDex/)).toBeInTheDocument();
  });

  it('renders all four feedback type cards', () => {
    render(<FeedbackSettings />);

    expect(screen.getByText('Bug Report')).toBeInTheDocument();
    expect(screen.getByText('Feature Request')).toBeInTheDocument();
    expect(screen.getByText('Design Feedback')).toBeInTheDocument();
    expect(screen.getByText('General Feedback')).toBeInTheDocument();
  });

  it('selects General Feedback by default', () => {
    render(<FeedbackSettings />);

    // The description for general should be visible
    expect(screen.getByText('Questions, comments, or other feedback')).toBeInTheDocument();
    // Default placeholder should be general-specific
    expect(screen.getByPlaceholderText(/Share your thoughts/)).toBeInTheDocument();
  });

  it('renders message textarea', () => {
    render(<FeedbackSettings />);

    expect(screen.getByPlaceholderText(/Share your thoughts/)).toBeInTheDocument();
  });

  it('renders send button disabled initially', () => {
    render(<FeedbackSettings />);

    const sendButton = screen.getByRole('button', { name: /Open in Email App/i });
    expect(sendButton).toBeDisabled();
  });

  it('renders email address display', () => {
    render(<FeedbackSettings />);

    expect(screen.getByText('feedback@jdex.app')).toBeInTheDocument();
  });

  it('renders copy email button', () => {
    render(<FeedbackSettings />);

    expect(screen.getByTitle('Copy email')).toBeInTheDocument();
  });
});

// =============================================================================
// Type Selection Tests
// =============================================================================

describe('FeedbackSettings Type Selection', () => {
  it('updates selection when clicking a type card', async () => {
    const user = userEvent.setup();
    render(<FeedbackSettings />);

    const bugCard = screen.getByText('Bug Report').closest('button');
    await user.click(bugCard);

    // Placeholder should change to bug-specific text
    expect(screen.getByPlaceholderText(/Describe the bug/)).toBeInTheDocument();
  });

  it('shows bug-specific placeholder when bug is selected', async () => {
    const user = userEvent.setup();
    render(<FeedbackSettings />);

    const bugCard = screen.getByText('Bug Report').closest('button');
    await user.click(bugCard);

    expect(
      screen.getByPlaceholderText(/what happened, what you expected, and steps to reproduce/)
    ).toBeInTheDocument();
  });

  it('shows feature-specific placeholder when feature is selected', async () => {
    const user = userEvent.setup();
    render(<FeedbackSettings />);

    const featureCard = screen.getByText('Feature Request').closest('button');
    await user.click(featureCard);

    expect(
      screen.getByPlaceholderText(/Describe the feature you'd like to see/)
    ).toBeInTheDocument();
  });

  it('shows design-specific placeholder when design is selected', async () => {
    const user = userEvent.setup();
    render(<FeedbackSettings />);

    const designCard = screen.getByText('Design Feedback').closest('button');
    await user.click(designCard);

    expect(screen.getByPlaceholderText(/Share your design thoughts/)).toBeInTheDocument();
  });
});

// =============================================================================
// Message Input Tests
// =============================================================================

describe('FeedbackSettings Message Input', () => {
  it('updates message state when typing', async () => {
    const user = userEvent.setup();
    render(<FeedbackSettings />);

    const textarea = screen.getByPlaceholderText(/Share your thoughts/);
    await user.type(textarea, 'Test message');

    expect(textarea).toHaveValue('Test message');
  });

  it('displays character count', async () => {
    const user = userEvent.setup();
    render(<FeedbackSettings />);

    expect(screen.getByText('0/2000')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Share your thoughts/);
    await user.type(textarea, 'Hello');

    expect(screen.getByText('5/2000')).toBeInTheDocument();
  });

  it('truncates message at max length', async () => {
    render(<FeedbackSettings />);

    const textarea = screen.getByPlaceholderText(/Share your thoughts/);

    // Create a string longer than 2000 characters
    const longString = 'a'.repeat(2100);

    // Simulate paste or change with long text
    fireEvent.change(textarea, { target: { value: longString } });

    expect(textarea.value).toHaveLength(2000);
    expect(screen.getByText('2000/2000')).toBeInTheDocument();
  });

  it('enables send button when message has content', async () => {
    const user = userEvent.setup();
    render(<FeedbackSettings />);

    const sendButton = screen.getByRole('button', { name: /Open in Email App/i });
    expect(sendButton).toBeDisabled();

    const textarea = screen.getByPlaceholderText(/Share your thoughts/);
    await user.type(textarea, 'Test message');

    expect(sendButton).not.toBeDisabled();
  });
});

// =============================================================================
// Email Submission Tests
// =============================================================================

describe('FeedbackSettings Email Submission', () => {
  it('does not call window.open when button is disabled', () => {
    render(<FeedbackSettings />);

    const sendButton = screen.getByRole('button', { name: /Open in Email App/i });
    expect(sendButton).toBeDisabled();

    // Clicking a disabled button shouldn't trigger handler
    fireEvent.click(sendButton);

    expect(mockWindowOpen).not.toHaveBeenCalled();
  });

  it('opens email client with mailto URL when clicking send', async () => {
    const user = userEvent.setup();
    render(<FeedbackSettings />);

    const textarea = screen.getByPlaceholderText(/Share your thoughts/);
    await user.type(textarea, 'Great app!');

    const sendButton = screen.getByRole('button', { name: /Open in Email App/i });
    await user.click(sendButton);

    expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    const url = mockWindowOpen.mock.calls[0][0];
    expect(url).toContain('mailto:feedback@jdex.app');
    expect(url).toContain('subject=');
    expect(url).toContain('Great%20app');
  });

  it('includes correct subject prefix for bug type', async () => {
    const user = userEvent.setup();
    render(<FeedbackSettings />);

    // Select bug type
    const bugCard = screen.getByText('Bug Report').closest('button');
    await user.click(bugCard);

    const textarea = screen.getByPlaceholderText(/Describe the bug/);
    await user.type(textarea, 'Found a bug');

    const sendButton = screen.getByRole('button', { name: /Open in Email App/i });
    await user.click(sendButton);

    const url = mockWindowOpen.mock.calls[0][0];
    expect(url).toContain('%5BBug%5D'); // [Bug] URL encoded
  });

  it('shows success state after sending', async () => {
    const user = userEvent.setup();
    render(<FeedbackSettings />);

    const textarea = screen.getByPlaceholderText(/Share your thoughts/);
    await user.type(textarea, 'Test message');

    const sendButton = screen.getByRole('button', { name: /Open in Email App/i });
    await user.click(sendButton);

    expect(screen.getByText('Email Client Opened!')).toBeInTheDocument();
  });

  it('resets state after timeout', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FeedbackSettings />);

    const textarea = screen.getByPlaceholderText(/Share your thoughts/);

    // Type using fireEvent to avoid timer issues
    fireEvent.change(textarea, { target: { value: 'Test message' } });

    const sendButton = screen.getByRole('button', { name: /Open in Email App/i });
    fireEvent.click(sendButton);

    expect(screen.getByText('Email Client Opened!')).toBeInTheDocument();

    // Fast-forward 3 seconds
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // Should reset back to normal state
    expect(screen.getByText('Open in Email App')).toBeInTheDocument();

    vi.useRealTimers();
  });
});

// =============================================================================
// Copy Email Tests
// =============================================================================

describe('FeedbackSettings Copy Email', () => {
  it('copies email address to clipboard', async () => {
    render(<FeedbackSettings />);

    const copyButton = screen.getByTitle('Copy email');
    fireEvent.click(copyButton);

    expect(mockClipboardWriteText).toHaveBeenCalledWith('feedback@jdex.app');
  });

  it('shows copied feedback (checkmark icon changes)', () => {
    render(<FeedbackSettings />);

    const copyButton = screen.getByTitle('Copy email');
    fireEvent.click(copyButton);

    // After clicking, should show checkmark (green)
    expect(copyButton.querySelector('.text-green-400')).toBeInTheDocument();
  });

  it('resets copied state after timeout', async () => {
    vi.useFakeTimers();
    render(<FeedbackSettings />);

    const copyButton = screen.getByTitle('Copy email');
    fireEvent.click(copyButton);

    // Checkmark should be visible
    expect(copyButton.querySelector('.text-green-400')).toBeInTheDocument();

    // Fast-forward 2 seconds
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Should reset - checkmark should be gone
    expect(copyButton.querySelector('.text-green-400')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});

// =============================================================================
// Design Tip Tests
// =============================================================================

describe('FeedbackSettings Design Tip', () => {
  it('does not show design tip by default (general selected)', () => {
    render(<FeedbackSettings />);

    expect(screen.queryByText('Design Feedback Tip')).not.toBeInTheDocument();
  });

  it('shows design tip when design type is selected', async () => {
    const user = userEvent.setup();
    render(<FeedbackSettings />);

    const designCard = screen.getByText('Design Feedback').closest('button');
    await user.click(designCard);

    expect(screen.getByText('Design Feedback Tip')).toBeInTheDocument();
    expect(screen.getByText(/attach screenshots to your email/)).toBeInTheDocument();
  });

  it('hides design tip when switching away from design type', async () => {
    const user = userEvent.setup();
    render(<FeedbackSettings />);

    // Select design
    const designCard = screen.getByText('Design Feedback').closest('button');
    await user.click(designCard);
    expect(screen.getByText('Design Feedback Tip')).toBeInTheDocument();

    // Select bug
    const bugCard = screen.getByText('Bug Report').closest('button');
    await user.click(bugCard);

    expect(screen.queryByText('Design Feedback Tip')).not.toBeInTheDocument();
  });
});

// =============================================================================
// What Happens Next Section Tests
// =============================================================================

describe('FeedbackSettings What Happens Next', () => {
  it('renders the what happens next section', () => {
    render(<FeedbackSettings />);

    expect(screen.getByText('What happens next?')).toBeInTheDocument();
  });

  it('displays all information items', () => {
    render(<FeedbackSettings />);

    expect(screen.getByText('We read every piece of feedback')).toBeInTheDocument();
    expect(
      screen.getByText('Bug reports are prioritized and fixed in updates')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Popular feature requests get added to our roadmap')
    ).toBeInTheDocument();
  });
});
