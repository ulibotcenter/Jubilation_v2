"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";
import { coachReply, type CoachMessage } from "@/lib/ai/retirementCoach";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { canAccess } from "@/lib/plans";
import { useAppStore } from "@/store/useAppStore";

export function RetirementCoach() {
  const open = useAppStore((s) => s.coachOpen);
  const setCoachOpen = useAppStore((s) => s.setCoachOpen);
  const plan = useAppStore((s) => s.planTier);
  const kpis = useAppStore((s) => s.kpis);
  const projections = useAppStore((s) => s.projections);
  const history = useAppStore((s) => s.aiChatHistory);
  const pushAiMessage = useAppStore((s) => s.pushAiMessage);
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  const projected =
    projections[projections.length - 1]?.portfolioValue ?? 0;
  const unlimited = canAccess(plan, "ai_coach_unlimited");
  const messageCount = history.filter((m) => m.role === "user").length;

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    if (!unlimited && messageCount >= 5) return;

    const userMsg: CoachMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    pushAiMessage(userMsg);
    const reply = coachReply(text, { kpis, projectedAtRetirement: projected });
    pushAiMessage({
      id: `a-${Date.now()}`,
      role: "assistant",
      content: reply,
      createdAt: new Date().toISOString(),
    });
    setDraft("");
  };

  return (
    <>
      <button
        type="button"
        className="coach-fab"
        onClick={() => setCoachOpen(true)}
        aria-label={t("ai.title")}
      >
        <MessageCircle className="w-5 h-5" size={20} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="coach-panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            <div className="coach-panel-header">
              <h3>{t("ai.title")}</h3>
              <button type="button" onClick={() => setCoachOpen(false)}>
                <X className="w-4 h-4" size={16} />
              </button>
            </div>
            <div className="coach-panel-messages">
              {history.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("ai.emptyHint")}
                </p>
              )}
              {history.map((m) => (
                <div
                  key={m.id}
                  className={`coach-msg coach-msg--${m.role}`}
                >
                  {m.content}
                </div>
              ))}
            </div>
            {!unlimited && messageCount >= 5 && (
              <p className="text-[10px] text-amber-400 px-3 pb-1">
                {t("ai.limitReached")}
              </p>
            )}
            <div className="coach-panel-input">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={t("ai.placeholder")}
                disabled={!unlimited && messageCount >= 5}
              />
              <button type="button" onClick={send}>
                <Send className="w-4 h-4" size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}