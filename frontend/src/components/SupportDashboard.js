import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import AuthContext from "../context/AuthProvider";
import { useConfig } from "../context/ConfigContext";
import LiveChat from "./LiveChat";
import AdminShell from "./admin/AdminShell";
import {
  GlassCard,
  GradientBorderCard,
  glassButtonClass,
  SectionHeader,
  Divider,
} from "./admin/ui";

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
};

const deriveConversationUser = (conversationKey) =>
  conversationKey?.startsWith("conv:user:")
    ? conversationKey.replace("conv:user:", "")
    : conversationKey || "";

const SupportDashboard = () => {
  const { auth } = useContext(AuthContext);
  const { apiBaseUrl } = useConfig();

  const [notifications, setNotifications] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [targetUsername, setTargetUsername] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [systemMessage, setSystemMessage] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingSystem, setLoadingSystem] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const notificationStats = useMemo(() => {
    const buckets = { sent: 0, failed: 0, queued: 0 };
    notifications.forEach((item) => {
      const key = item.status;
      if (key && buckets[key] !== undefined) {
        buckets[key] += 1;
      }
    });
    return buckets;
  }, [notifications]);

  const metaSummary = useMemo(
    () => [
      {
        label: "Notifications",
        value: `${notifications.length.toString().padStart(2, "0")}`,
        key: "notifications",
      },
      {
        label: "Conversations",
        value: `${conversations.length.toString().padStart(2, "0")}`,
        key: "conversations",
      },
      {
        label: "Active thread",
        value: deriveConversationUser(activeConversation) || "None",
        key: "thread",
      },
      {
        label: "Updated",
        value: lastRefreshed
          ? new Date(lastRefreshed).toLocaleTimeString()
          : "Pending",
        key: "refreshed",
      },
    ],
    [activeConversation, conversations.length, lastRefreshed, notifications.length]
  );

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/support/notifications?limit=100`
      );
      const data = await response.json();
      if (data?.success) {
        setNotifications(data.notifications || []);
        setLastRefreshed(Date.now());
      } else {
        throw new Error(data?.message || "Unable to load notifications");
      }
    } catch (error) {
      console.error("Failed to load notifications", error);
      toast.error(error.message || "Failed to load notifications");
    }
  }, [apiBaseUrl]);

  const fetchConversations = useCallback(async () => {
    if (auth?.role !== "admin") return;
    try {
      const response = await fetch(
        `${apiBaseUrl}/support/conversations?limit=100`
      );
      const data = await response.json();
      if (data?.success) {
        setConversations(data.conversations || []);
      } else {
        throw new Error(data?.message || "Unable to load conversations");
      }
    } catch (error) {
      console.error("Failed to load conversations", error);
      toast.error(error.message || "Failed to load conversations");
    }
  }, [apiBaseUrl, auth?.role]);

  const fetchChatHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const params = activeConversation
        ? `?limit=100&conversationKey=${encodeURIComponent(
            activeConversation
          )}`
        : "?limit=100";
      const response = await fetch(
        `${apiBaseUrl}/support/chat-history${params}`
      );
      const data = await response.json();
      if (data?.success) {
        setChatHistory(data.messages || []);
      } else {
        throw new Error(data?.message || "Unable to load chat history");
      }
    } catch (error) {
      console.error("Failed to load chat history", error);
      toast.error(error.message || "Failed to load chat history");
    } finally {
      setLoadingHistory(false);
    }
  }, [activeConversation, apiBaseUrl]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSendTestEmail = async (event) => {
    event.preventDefault();
    if (!testEmail.trim()) {
      toast.error("Enter a recipient email address");
      return;
    }
    setLoadingEmail(true);
    try {
      const response = await fetch(`${apiBaseUrl}/support/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail.trim() }),
      });
      const data = await response.json();
      if (data?.success) {
        toast.success(data.message || "Test email dispatched");
        setTestEmail("");
        fetchNotifications();
      } else {
        throw new Error(data?.message || "Unable to send test email");
      }
    } catch (error) {
      console.error("Failed to send test email", error);
      toast.error(error.message || "Failed to send test email");
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleSendSystemMessage = async (event) => {
    event.preventDefault();
    if (!systemMessage.trim()) {
      toast.error("Message body is required");
      return;
    }
    setLoadingSystem(true);
    try {
      const response = await fetch(`${apiBaseUrl}/support/system-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: systemMessage.trim() }),
      });
      const data = await response.json();
      if (data?.success) {
        toast.success(data.message || "System message broadcasted");
        setSystemMessage("");
        fetchNotifications();
      } else {
        throw new Error(data?.message || "Unable to send message");
      }
    } catch (error) {
      console.error("Failed to send system message", error);
      toast.error(error.message || "Failed to send system message");
    } finally {
      setLoadingSystem(false);
    }
  };

  const handleConversationSelect = (conversationKey) => {
    setActiveConversation(conversationKey);
    const resolvedUser = deriveConversationUser(conversationKey);
    setTargetUsername(resolvedUser);
    setShowLiveChat(true);
  };

  const handleStartDirectConversation = () => {
    if (!targetUsername.trim()) {
      toast.error("Provide a username to open a conversation");
      return;
    }
    const conversationKey = `conv:user:${targetUsername.trim()}`;
    handleConversationSelect(conversationKey);
  };

  return (
    <AdminShell
      title="Support Control Center"
      subtitle="Monitor outbound messaging, triage conversations, and intervene in real time across the customer support surface."
      meta={metaSummary}
      actions={
        <button
          type="button"
          onClick={() => {
            fetchNotifications();
            fetchChatHistory();
            fetchConversations();
          }}
          className={glassButtonClass}
        >
          Refresh data
        </button>
      }
    >
      <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-8">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <GlassCard className="p-6" tone="highlight">
            <SectionHeader
              title="Email operations"
              subtitle="Trigger test dispatches and monitor aggregated delivery health."
            />
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <form
                onSubmit={handleSendTestEmail}
                className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/50">
                  Test email
                </p>
                <p className="text-sm text-white/60">
                  Verify SMTP configuration by dispatching a sample message to any recipient.
                </p>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(event) => setTestEmail(event.target.value)}
                  placeholder="support@example.com"
                  className="w-full rounded-2xl border border-white/12 bg-white/10 px-4 py-2.5 text-sm text-white/80 focus:border-white/40 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className={`${glassButtonClass} w-full justify-center border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-400/60 hover:bg-emerald-500/20 ${
                    loadingEmail ? "cursor-wait opacity-70" : ""
                  }`}
                  disabled={loadingEmail}
                >
                  {loadingEmail ? "Sending…" : "Send test email"}
                </button>
              </form>
              <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/50">
                  Delivery snapshot
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-emerald-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">
                      Sent
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-200">
                      {notificationStats.sent}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-amber-100/80">
                      Queued
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-amber-100">
                      {notificationStats.queued}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-rose-100/80">
                      Failed
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-rose-100">
                      {notificationStats.failed}
                    </p>
                  </div>
                </div>
                <Divider />
                <form onSubmit={handleSendSystemMessage} className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/50">
                    System broadcast
                  </p>
                  <textarea
                    value={systemMessage}
                    onChange={(event) => setSystemMessage(event.target.value)}
                    placeholder="Share an incident update or scheduled maintenance alert"
                    className="min-h-[110px] w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white/80 focus:border-white/40 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className={`${glassButtonClass} w-full justify-center border-sky-500/40 bg-sky-500/10 hover:border-sky-400/60 hover:bg-sky-500/20 ${
                      loadingSystem ? "cursor-wait opacity-70" : ""
                    }`}
                    disabled={loadingSystem}
                  >
                    {loadingSystem ? "Broadcasting…" : "Send system message"}
                  </button>
                </form>
              </div>
            </div>
          </GlassCard>

          <GradientBorderCard className="h-full">
            <div className="flex h-full flex-col space-y-4">
              <SectionHeader
                title="Conversation directory"
                subtitle="Escalate across live chat threads when teams need support."
                actions={
                  <button
                    type="button"
                    onClick={fetchConversations}
                    className={`${glassButtonClass} text-xs`}
                  >
                    Refresh
                  </button>
                }
              />
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                  Jump to user
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={targetUsername}
                    onChange={(event) => setTargetUsername(event.target.value)}
                    placeholder="username"
                    className="min-w-[180px] flex-1 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-sm text-white/80 focus:border-white/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleStartDirectConversation}
                    className={`${glassButtonClass} border-emerald-400/40 bg-emerald-500/10 hover:border-emerald-300/60 hover:bg-emerald-500/20`}
                  >
                    Open thread
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <ul className="h-full space-y-2 overflow-y-auto pr-1">
                  {conversations.length === 0 ? (
                    <li className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-white/60">
                      No recent conversations.
                    </li>
                  ) : (
                    conversations.map((conversation) => {
                      const userHandle = deriveConversationUser(
                        conversation.conversation_key
                      );
                      const isActive =
                        activeConversation === conversation.conversation_key;
                      return (
                        <li key={conversation.conversation_key}>
                          <button
                            type="button"
                            onClick={() =>
                              handleConversationSelect(
                                conversation.conversation_key
                              )
                            }
                            className={`flex w-full items-start justify-between rounded-3xl border px-4 py-3 text-left transition ${
                              isActive
                                ? "border-emerald-400/50 bg-emerald-500/15"
                                : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
                            }`}
                          >
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {userHandle || "Unknown"}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.3em] text-white/50">
                                {conversation.message_preview || "New conversation"}
                              </p>
                            </div>
                            <span className="text-xs text-white/40">
                              {formatDateTime(conversation.last_message_at)}
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>
          </GradientBorderCard>
        </div>

        <GlassCard className="p-6">
          <SectionHeader
            title="Notification history"
            subtitle="Every outbound touchpoint with delivery state and timestamps."
            actions={
              <button
                type="button"
                onClick={fetchNotifications}
                className={`${glassButtonClass} text-xs`}
              >
                Refresh
              </button>
            }
          />
          <div className="mt-6 overflow-hidden rounded-3xl border border-white/10">
            <table className="min-w-full divide-y divide-white/5 text-sm text-white/70">
              <thead className="bg-white/5 text-[11px] uppercase tracking-[0.4em] text-white/50">
                <tr>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Recipient</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-sm text-white/50"
                      colSpan={6}
                    >
                      No notifications yet.
                    </td>
                  </tr>
                ) : (
                  notifications.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
                          {item.type || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/80">
                        {item.recipient || "—"}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {item.subject || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                            item.status === "sent"
                              ? "bg-emerald-500/10 text-emerald-200"
                              : item.status === "failed"
                              ? "bg-rose-500/10 text-rose-200"
                              : "bg-amber-500/10 text-amber-100"
                          }`}
                        >
                          {item.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="px-4 py-3 text-white/60">
                        {formatDateTime(item.sent_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <SectionHeader
            title="Live chat threads"
            subtitle="Review the latest 100 messages across the selected conversation."
            actions={
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">
                  {loadingHistory ? "Refreshing…" : "Auto-loaded"}
                </span>
                <button
                  type="button"
                  onClick={fetchChatHistory}
                  className={`${glassButtonClass} text-xs`}
                >
                  Refresh
                </button>
              </div>
            }
          />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                  Selected participant
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {deriveConversationUser(activeConversation) || "Not selected"}
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Use the directory above to choose a participant and open the embedded chat console.
                </p>
                <button
                  type="button"
                  onClick={() => setShowLiveChat((prev) => !prev)}
                  className={`${glassButtonClass} mt-4 w-full justify-center border-sky-500/40 bg-sky-500/10 hover:border-sky-400/60 hover:bg-sky-500/20`}
                  disabled={!targetUsername}
                >
                  {showLiveChat ? "Hide chat console" : "Open chat console"}
                </button>
              </div>
              {showLiveChat && (
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4">
                  <LiveChat
                    user={auth}
                    targetUsername={
                      auth?.role === "admin"
                        ? targetUsername ||
                          deriveConversationUser(activeConversation)
                        : undefined
                    }
                    onClose={() => setShowLiveChat(false)}
                  />
                </div>
              )}
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5">
              <div className="max-h-[420px] overflow-y-auto">
                {chatHistory.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-white/50">
                    No messages in this window.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {chatHistory.map((entry) => (
                      <li key={entry.id} className="px-6 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] ${
                                entry.role === "admin"
                                  ? "bg-rose-500/10 text-rose-200"
                                  : "bg-emerald-500/10 text-emerald-200"
                              }`}
                            >
                              {entry.role}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {entry.username}
                            </span>
                          </div>
                          <span className="text-xs text-white/40">
                            {formatDateTime(entry.created_at)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-white/70">
                          {entry.message}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </AdminShell>
  );
};

export default SupportDashboard;
