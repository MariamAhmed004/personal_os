import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Form, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../../shared/api";
import type { BacklogItem, CalendarEvent, DailySheet, MoodEntry } from "../../shared/types";
import { Icon } from "../../shared/Icon";
import { useTheme } from "../../app/ThemeContext";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposal: ChatProposal | null;
  decision: "pending" | "approved" | "denied" | null;
  result: { kind: string; record: { id: string; title: string } } | null;
}

interface CreateEventProposal {
  action: "create_event";
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  description: string | null;
}

interface CreateBacklogProposal {
  action: "create_backlog_item";
  title: string;
  description: string | null;
}

interface ScheduleBacklogProposal {
  action: "schedule_backlog_item";
  backlog_item_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
}

type ChatProposal = CreateEventProposal | CreateBacklogProposal | ScheduleBacklogProposal;

interface ChatResponse {
  user_message?: unknown;
  assistant_message?: unknown;
  response?: unknown;
}

interface ProposalDecisionResponse {
  message?: unknown;
}

function normalizeChatMessage(value: unknown): ChatMessage | null {
  if (typeof value !== "object" || value === null) return null;
  const message = value as Record<string, unknown>;
  if (
    typeof message.id !== "string"
    || (message.role !== "user" && message.role !== "assistant")
    || typeof message.content !== "string"
  ) return null;

  const decision = message.decision === "pending" || message.decision === "approved" || message.decision === "denied"
    ? message.decision
    : null;
  const result = typeof message.result === "object" && message.result !== null
    ? message.result as ChatMessage["result"]
    : null;
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    proposal: typeof message.proposal === "object" && message.proposal !== null
      ? message.proposal as ChatProposal
      : null,
    decision,
    result,
  };
}

function normalizeChatHistory(value: unknown): ChatMessage[] {
  return Array.isArray(value)
    ? value.map(normalizeChatMessage).filter((message): message is ChatMessage => message !== null)
    : [];
}

function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export function DashboardPage() {
  const { theme } = useTheme();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [sheet, setSheet] = useState<DailySheet | null>(null);
  const [mood, setMood] = useState<MoodEntry | null>(null);
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([]);
  const [error, setError] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [decidingMessageId, setDecidingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshDashboard = useCallback(async () => {
    try {
      const [calendarEvents, dailySheet, moods, backlog] = await Promise.all([
        api<CalendarEvent[]>("/calendar/events"),
        api<DailySheet>(`/daily-sheets/by-date/${todayDate()}`).catch(() => null),
        api<MoodEntry[]>("/moods"),
        api<BacklogItem[]>("/backlog/items"),
      ]);
      setEvents(calendarEvents.filter((event) => event.starts_at.slice(0, 10) >= todayDate()).slice(0, 4));
      setSheet(dailySheet);
      setMood(moods.find((entry) => entry.entry_date === todayDate()) ?? null);
      setBacklogItems(backlog.filter((item) => !item.is_completed).slice(0, 3));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load your home page.");
    }
  }, []);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    let active = true;
    api<unknown>("/ai/chat/history")
      .then((messages) => {
        if (active) setChatMessages(normalizeChatHistory(messages));
      })
      .catch((cause: unknown) => {
        if (active) setChatError(cause instanceof Error ? cause.message : "Could not load your conversation.");
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages, chatLoading]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setChatInput("");
    setChatError("");
    const optimisticId = `pending-${Date.now()}`;
    setChatMessages((current) => [...current, {
      id: optimisticId,
      role: "user",
      content: message,
      proposal: null,
      decision: null,
      result: null,
    }]);
    setChatLoading(true);
    try {
      const result = await api<ChatResponse>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message,
          theme,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        }),
      });
      const userMessage = normalizeChatMessage(result.user_message);
      const assistantMessage = normalizeChatMessage(result.assistant_message);
      if (userMessage && assistantMessage) {
        setChatMessages((current) => [
          ...current.filter((entry) => entry.id !== optimisticId),
          userMessage,
          assistantMessage,
        ]);
      } else if (typeof result.response === "string" && result.response.trim()) {
        setChatMessages((current) => [
          ...current.filter((entry) => entry.id !== optimisticId),
          {
            id: `legacy-${Date.now()}`,
            role: "assistant",
            content: result.response as string,
            proposal: null,
            decision: null,
            result: null,
          },
        ]);
        setChatError("Chat is using the older API. Rebuild the API service to enable saved history and action approvals.");
      } else {
        throw new Error("The AI API returned an unexpected chat response. Rebuild the API service and try again.");
      }
    } catch (cause) {
      setChatError(cause instanceof Error ? cause.message : "The assistant could not reply. Please try again.");
      setChatMessages((current) => current.filter((entry) => entry.id !== optimisticId));
      try {
        setChatMessages(normalizeChatHistory(await api<unknown>("/ai/chat/history")));
      } catch {
        // Keep the original chat error visible if history cannot be refreshed.
      }
    } finally {
      setChatLoading(false);
    }
  }

  async function decideProposal(message: ChatMessage, decision: "approved" | "denied") {
    if (!message.proposal || message.decision !== "pending") return;
    setChatError("");
    setDecidingMessageId(message.id);
    try {
      const result = await api<ProposalDecisionResponse>(`/ai/chat/${message.id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      const updatedMessage = normalizeChatMessage(result.message);
      if (!updatedMessage) throw new Error("The AI API returned an unexpected approval response. Rebuild the API service and try again.");
      setChatMessages((current) => current.map((entry) => entry.id === message.id ? updatedMessage : entry));
      if (decision === "approved") await refreshDashboard();
    } catch (cause) {
      setChatError(cause instanceof Error ? cause.message : "Could not update this proposal.");
    } finally {
      setDecidingMessageId(null);
    }
  }

  function proposalSummary(proposal: ChatProposal) {
    if (proposal.action === "create_backlog_item") return `Backlog item · ${proposal.title}`;
    if (proposal.action === "schedule_backlog_item") {
      return `Schedule ${proposal.title} · ${new Date(proposal.starts_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
    }
    return `${proposal.title} · ${new Date(proposal.starts_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
  }

  const date = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const focus = sheet?.highlights?.[0] ?? sheet?.tasks?.find((task) => !task.completed)?.title;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
      <div className="page-heading">
        <p className="eyebrow mb-2">{date}</p>
        <h1 className="page-title"><Icon name="home" className="heading-icon" />{greeting()}, let's make today yours.</h1>
        <p className="page-subtitle">A little space to decide what matters most.</p>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="planner-grid">
        <motion.div className="planner-span-8" whileHover={{ y: -2 }} transition={{ duration: .18 }}>
          <Card className="surface-card accent-green">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
                <p className="eyebrow mb-0">Today's focus</p>
                <Icon name="today" className="nav-icon text-success" />
              </div>
              <h2 className="h3 mb-2">{focus ?? "Choose one meaningful thing to move forward."}</h2>
              <p className="text-secondary mb-4">{sheet?.notes || "You don't have to do it all. Start with what feels important."}</p>
              <Link className="btn btn-primary" to="/daily-sheet">Open your Daily Sheet</Link>
            </Card.Body>
          </Card>
        </motion.div>
        <motion.div className="planner-span-4" whileHover={{ y: -2 }} transition={{ duration: .18 }}>
          <Card className="surface-card accent-amber">
            <Card.Body>
              <p className="eyebrow mb-3">A rhythm of your own</p>
              <div className="display-6 mb-2">🌱</div>
              <p className="mb-3">Small, kind promises to yourself add up.</p>
              <Link to="/habits">Visit your habits →</Link>
            </Card.Body>
          </Card>
        </motion.div>
        <div className="planner-span-6">
          <Card className="surface-card accent-teal">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <p className="eyebrow mb-0"><Icon name="calendar" className="button-icon" />Coming up</p><Link to="/calendar">Open calendar →</Link>
              </div>
              {events.length ? events.map((event) => (
                <div className="d-flex justify-content-between gap-3 border-bottom py-2" key={event.id}>
                  <span className="fw-semibold">{event.title}</span>
                  <span className="text-secondary text-nowrap small">{new Date(event.starts_at).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
                </div>
              )) : <p className="text-secondary mb-0">Nothing on the calendar yet. Leave a little breathing room.</p>}
            </Card.Body>
          </Card>
        </div>
        <div className="planner-span-6">
          <Card className="surface-card accent-rose dashboard-small-card">
            <Card.Body>
              <p className="eyebrow"><Icon name="mood" className="button-icon" />How are you feeling?</p>
              {mood ? <><div className="h2 mb-1">{({ great: "😀", good: "🙂", okay: "😐", low: "😔" } as Record<string, string>)[mood.mood] ?? "🙂"}</div><p className="mb-0 text-secondary text-capitalize">{mood.mood} today</p></> : <p className="mb-0 text-secondary">Take a moment to check in with yourself.</p>}
              <Link className="dashboard-card-action" to="/daily-sheet">Daily Sheet →</Link>
            </Card.Body>
          </Card>
        </div>
        <div className="planner-span-6">
          <Card className="surface-card accent-purple dashboard-small-card">
            <Card.Body>
              <p className="eyebrow"><Icon name="journal" className="button-icon" />A moment to reflect</p>
              <p>Notice how far you've come, one page at a time.</p>
              <Link className="dashboard-card-action" to="/journal">Visit your journal →</Link>
            </Card.Body>
          </Card>
        </div>
        <div className="planner-span-6">
          <Card className="surface-card accent-amber dashboard-small-card">
            <Card.Body>
              <p className="eyebrow"><Icon name="backlog" className="button-icon" />On your mind</p>
              {backlogItems.length ? (
                <ul className="dashboard-backlog-list">
                  {backlogItems.map((item) => <li key={item.id}>{item.title}</li>)}
                </ul>
              ) : <p className="mb-0 text-secondary">Your backlog is clear for now.</p>}
              <Link className="dashboard-card-action" to="/backlog">Visit your backlog →</Link>
            </Card.Body>
          </Card>
        </div>
        <div className="planner-span-12">
          <Card className="surface-card accent-green">
            <Card.Body>
              <div className="d-flex align-items-center gap-2 mb-3">
                <Icon name="sparkles" className="header-icon" />
                <div>
                  <h2 className="h5 mb-1">Your Personal OS assistant</h2>
                  <p className="small text-secondary mb-0">A friendly place to think something through.</p>
                </div>
              </div>
              <div className="chat-messages" role="log" aria-live="polite" aria-label="Assistant conversation">
                {historyLoading && <div className="chat-message-loading"><Spinner animation="border" size="sm" role="status" /><span>Loading your conversation…</span></div>}
                {chatMessages.length === 0 && !historyLoading && <p className="text-secondary mb-0">Ask a question, sort out a thought, or get help finding a first step.</p>}
                {normalizeChatHistory(chatMessages).map((message) => (
                  <div className={`chat-message-group ${message.role}`} key={message.id}>
                    <div className={`chat-message ${message.role}`}>{message.content}</div>
                    {message.proposal && (
                      <div className="chat-proposal">
                        <p className="small fw-semibold mb-2">{proposalSummary(message.proposal)}</p>
                        {message.decision === "pending" ? (
                          <div className="d-flex flex-wrap gap-2">
                            <Button size="sm" disabled={decidingMessageId === message.id} onClick={() => void decideProposal(message, "approved")}>
                              {decidingMessageId === message.id ? <Spinner animation="border" size="sm" /> : "Approve"}
                            </Button>
                            <Button size="sm" variant="outline-secondary" disabled={decidingMessageId === message.id} onClick={() => void decideProposal(message, "denied")}>Deny</Button>
                          </div>
                        ) : (
                          <p className="small mb-0 text-secondary">
                            {message.decision === "approved" ? `Approved${message.result?.record?.title ? ` · ${message.result.record.title} added` : ""}` : "Declined"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && <div className="chat-message-loading"><Spinner animation="border" size="sm" role="status" /><span>Thinking…</span></div>}
                <div ref={messagesEndRef} />
              </div>
              {chatError && <Alert variant="danger" className="mt-3 mb-0">{chatError}</Alert>}
              <Form onSubmit={sendMessage} className="chat-form">
                <Form.Control
                  aria-label="Message your Personal OS assistant"
                  placeholder="What would you like to talk through?"
                  maxLength={4000}
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                />
                <Button className="chat-send" type="submit" disabled={chatLoading || historyLoading || !chatInput.trim()} aria-label="Send message">
                  <Icon name="send" className="button-icon" />Send
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
