import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MessageList } from "../MessageList";

// Mock the MarkdownRenderer component
vi.mock("../MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

afterEach(() => {
  cleanup();
});

// Helper to create a UIMessage with text parts
function userMsg(id: string, text: string) {
  return { id, role: "user" as const, parts: [{ type: "text" as const, text }] };
}

function assistantMsg(id: string, text: string) {
  return { id, role: "assistant" as const, parts: [{ type: "text" as const, text }] };
}

test("MessageList shows empty state when no messages", () => {
  render(<MessageList messages={[]} />);

  expect(
    screen.getByText("Start a conversation to generate React components")
  ).toBeDefined();
  expect(
    screen.getByText("I can help you create buttons, forms, cards, and more")
  ).toBeDefined();
});

test("MessageList renders user messages", () => {
  const messages = [userMsg("1", "Create a button component")];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Create a button component")).toBeDefined();
});

test("MessageList renders assistant messages", () => {
  const messages = [assistantMsg("1", "I'll help you create a button component.")];

  render(<MessageList messages={messages} />);

  expect(
    screen.getByText("I'll help you create a button component.")
  ).toBeDefined();
});

test("MessageList renders messages with tool invocation parts", () => {
  const messages = [
    {
      id: "1",
      role: "assistant" as const,
      parts: [
        { type: "text" as const, text: "Creating your component..." },
        {
          type: "tool-invocation" as const,
          toolInvocation: {
            toolCallId: "asdf",
            args: {},
            toolName: "str_replace_editor",
            state: "result" as const,
            result: "Success",
          },
        },
      ],
    },
  ];

  render(<MessageList messages={messages as any} />);

  expect(screen.getByText("Creating your component...")).toBeDefined();
  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

test("MessageList shows loading state for last assistant message with empty parts", () => {
  const messages = [
    { id: "1", role: "assistant" as const, parts: [] },
  ];

  render(<MessageList messages={messages} isLoading={true} />);

  expect(screen.getByText("Generating...")).toBeDefined();
});

test("MessageList doesn't show loading state for non-last messages", () => {
  const messages = [
    assistantMsg("1", "First response"),
    userMsg("2", "Another request"),
  ];

  render(<MessageList messages={messages} isLoading={true} />);

  expect(screen.queryByText("Generating...")).toBeNull();
});

test("MessageList renders reasoning parts", () => {
  const messages = [
    {
      id: "1",
      role: "assistant" as const,
      parts: [
        { type: "text" as const, text: "Let me analyze this." },
        {
          type: "reasoning" as const,
          reasoning: "The user wants a button component with specific styling.",
        },
      ],
    },
  ];

  render(<MessageList messages={messages as any} />);

  expect(screen.getByText("Reasoning")).toBeDefined();
  expect(
    screen.getByText("The user wants a button component with specific styling.")
  ).toBeDefined();
});

test("MessageList renders multiple messages in correct order", () => {
  const messages = [
    userMsg("1", "First user message"),
    assistantMsg("2", "First assistant response"),
    userMsg("3", "Second user message"),
    assistantMsg("4", "Second assistant response"),
  ];

  const { container } = render(<MessageList messages={messages} />);

  const messageContainers = container.querySelectorAll(".rounded-xl");
  expect(messageContainers).toHaveLength(4);

  expect(messageContainers[0].textContent).toContain("First user message");
  expect(messageContainers[1].textContent).toContain("First assistant response");
  expect(messageContainers[2].textContent).toContain("Second user message");
  expect(messageContainers[3].textContent).toContain("Second assistant response");
});

test("MessageList handles step-start parts", () => {
  const messages = [
    {
      id: "1",
      role: "assistant" as const,
      parts: [
        { type: "text" as const, text: "Step 1 content" },
        { type: "step-start" as const },
        { type: "text" as const, text: "Step 2 content" },
      ],
    },
  ];

  render(<MessageList messages={messages as any} />);

  expect(screen.getByText("Step 1 content")).toBeDefined();
  expect(screen.getByText("Step 2 content")).toBeDefined();
  const container = screen.getByText("Step 1 content").closest(".rounded-xl");
  expect(container?.querySelector("hr")).toBeDefined();
});

test("MessageList applies correct styling for user vs assistant messages", () => {
  const messages = [
    userMsg("1", "User message"),
    assistantMsg("2", "Assistant message"),
  ];

  render(<MessageList messages={messages} />);

  const userMessage = screen.getByText("User message").closest(".rounded-xl");
  const assistantMessage = screen
    .getByText("Assistant message")
    .closest(".rounded-xl");

  expect(userMessage?.className).toContain("bg-blue-600");
  expect(userMessage?.className).toContain("text-white");
  expect(assistantMessage?.className).toContain("bg-white");
  expect(assistantMessage?.className).toContain("text-neutral-900");
});

test("MessageList handles empty parts with loading", () => {
  const messages = [
    { id: "1", role: "assistant" as const, parts: [] },
  ];

  const { container } = render(
    <MessageList messages={messages} isLoading={true} />
  );

  const loadingText = container.querySelectorAll(".text-neutral-500");
  const generatingElements = Array.from(loadingText).filter(
    (el) => el.textContent === "Generating..."
  );
  expect(generatingElements).toHaveLength(1);
});
