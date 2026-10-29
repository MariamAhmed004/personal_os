import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../shared/Icon";

interface WalkthroughStep {
  path: string;
  target: string;
  title: string;
  description: string;
}

const steps: WalkthroughStep[] = [
  {
    path: "/",
    target: "dashboard",
    title: "Your home",
    description: "Start here for a gentle overview of today and a place to talk things through.",
  },
  {
    path: "/daily-sheet",
    target: "daily-sheet",
    title: "Your Daily Sheet",
    description: "Shape the day with a schedule, a short task list, and space to reflect.",
  },
  {
    path: "/habits",
    target: "habits",
    title: "Habits",
    description: "Set a simple weekly rhythm and see recurring habits in your schedule.",
  },
  {
    path: "/calendar",
    target: "calendar",
    title: "Calendar",
    description: "See your events by week or month and add plans to a day.",
  },
  {
    path: "/backlog",
    target: "for-later",
    title: "For Later",
    description: "Keep unscheduled ideas here until you’re ready to make time for them.",
  },
  {
    path: "/journal",
    target: "journal",
    title: "Journal",
    description: "Look back at mood check-ins, Daily Sheets, and reflections you’ve saved.",
  },
  {
    path: "/",
    target: "assistant",
    title: "Your assistant",
    description: "Ask for help thinking something through. Suggested actions always wait for your approval.",
  },
];

interface WalkthroughProps {
  open: boolean;
  onFinish: () => void;
}

export function Walkthrough({ open, onFinish }: WalkthroughProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dialogRef = useRef<HTMLElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const step = steps[stepIndex];

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    navigate("/", { replace: false });
  }, [open, navigate]);

  useEffect(() => {
    if (!open || !step) {
      setTarget(null);
      return;
    }
    if (location.pathname !== step.path) {
      setTarget(null);
      navigate(step.path);
      return;
    }

    const element = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!element) {
      setStepIndex((current) => current + 1);
      return;
    }

    element.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
    element.classList.add("tour-target-highlight");
    const sidebar = element.closest(".app-sidebar");
    sidebar?.classList.add("walkthrough-sidebar-target");
    setTarget(element);

    const updatePosition = () => {
      const bounds = element.getBoundingClientRect();
      const left = Math.max(12, Math.min(bounds.left, window.innerWidth - 372));
      const below = bounds.bottom + 230 <= window.innerHeight;
      const top = below ? bounds.bottom + 14 : Math.max(12, bounds.top - 230);
      setPosition({ left, top });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      element.classList.remove("tour-target-highlight");
      sidebar?.classList.remove("walkthrough-sidebar-target");
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [location.pathname, navigate, open, step]);

  useEffect(() => {
    if (open && target) nextButtonRef.current?.focus();
  }, [open, stepIndex, target]);

  useEffect(() => {
    if (open && stepIndex >= steps.length) onFinish();
  }, [onFinish, open, stepIndex]);

  function advance() {
    setTarget(null);
    setStepIndex((current) => current + 1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onFinish();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;

    const buttons = [...dialogRef.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  if (!open || !step) return null;

  return (
    <>
      <div className="walkthrough-backdrop" aria-hidden="true" />
      <section
        className="walkthrough-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkthrough-title"
        aria-describedby="walkthrough-description"
        style={{ left: position.left, top: position.top }}
        onKeyDown={handleKeyDown}
      >
        <div className="d-flex align-items-start gap-2">
          <Icon name="sparkles" className="walkthrough-icon" />
          <div>
            <p className="small text-secondary mb-1">A quick tour · {stepIndex + 1} of {steps.length}</p>
            <h2 className="h5 mb-2" id="walkthrough-title">{step.title}</h2>
          </div>
        </div>
        <p className="mb-3" id="walkthrough-description">{step.description}</p>
        <div className="d-flex justify-content-between gap-2">
          <Button size="sm" variant="outline-secondary" onClick={onFinish}>Skip</Button>
          <Button size="sm" ref={nextButtonRef} onClick={advance}>
            {stepIndex === steps.length - 1 ? "Finish" : "Next"}
          </Button>
        </div>
      </section>
    </>
  );
}
