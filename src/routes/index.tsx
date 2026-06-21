import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import redButtonAsset from "@/assets/red-button-v2.png.asset.json";
import { WALLET_ADDRESS } from "@/lib/config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nothing Happens" },
      { name: "description", content: "An anti-dopamine clicker. Press the button. Nothing happens." },
      { property: "og:title", content: "Nothing Happens" },
      { property: "og:description", content: "An anti-dopamine clicker. Press the button. Nothing happens." },
    ],
  }),
  component: NothingHappens,
});

const STORAGE_KEY = "nh:clickCount";
const COMPLETED_KEY = "nh:completed";

const FINAL = 1_000_324_591;

function messageFor(count: number): string {
  if (count === 100_000) return "still nothing happens";
  if (count === 1_000_000) return "Is this some kind of game?";
  if (count === FINAL) return "okay. you win. why?";
  if (count >= 100) return "?";
  return "nothing happens";
}

const MILESTONES = new Set<number>([100_000, 1_000_000, FINAL]);

function NothingHappens() {
  const [count, setCount] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [pressed, setPressed] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [showCrypto, setShowCrypto] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [copied, setCopied] = useState(false);
  const hydrated = useRef(false);
  const domeDown = useRef(false);
  const trueCount = useRef(0);
  const triggeredCounts = useRef<Set<number>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = parseInt(raw || "", 10) || 0;
      setCount(parsed);
      trueCount.current = parsed;
      setCompleted(localStorage.getItem(COMPLETED_KEY) === "1");
    } catch {}
    hydrated.current = true;

    // Telegram WebApp init
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor?.("#ffffff");
        tg.setBackgroundColor?.("#ffffff");
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(count));
    } catch {}
  }, [count]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(COMPLETED_KEY, completed ? "1" : "0");
    } catch {}
  }, [completed]);

  const messageTimer = useRef<number | null>(null);

  function handlePress() {
    const alreadyDown = domeDown.current;
    domeDown.current = true;
    setPressed(true);
    window.setTimeout(() => {
      setPressed(false);
      domeDown.current = false;
    }, 120);

    const next = trueCount.current + 1;
    trueCount.current = next;
    setCount(next);

    const msg = messageFor(next);
    const isMilestone = MILESTONES.has(next);
    if (!isMilestone || !triggeredCounts.current.has(next)) {
      if (isMilestone) triggeredCounts.current.add(next);
      setMessage(msg);

      if (messageTimer.current) {
        window.clearTimeout(messageTimer.current);
      }
      messageTimer.current = window.setTimeout(() => {
        setMessage("");
      }, 600);
    }

    if (!completed && next === FINAL) {
      setCompleted(true);
      window.setTimeout(() => setShowVictory(true), 400);
    }

    // Telegram haptic — only when the dome actually begins pressing down
    if (!alreadyDown) {
      const tg = (window as any).Telegram?.WebApp;
      try {
        tg?.HapticFeedback?.impactOccurred?.("light");
      } catch {}
    }
  }

  function restart() {
    trueCount.current = 0;
    triggeredCounts.current.clear();
    setCount(0);
    setCompleted(false);
    setMessage("");
    setShowVictory(false);
  }

  function payWithStars() {
    const tg = (window as any).Telegram?.WebApp;
    // Backend hook placeholder: in production, request an invoice link from the server
    // and open it via tg.openInvoice(slug, callback).
    if (tg?.openInvoice) {
      try {
        tg.showAlert?.("Telegram Stars payment is not yet configured.");
      } catch {}
    } else {
      alert("Telegram Stars payment is not yet configured.");
    }
  }

  async function copyWallet() {
    try {
      await navigator.clipboard.writeText(WALLET_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="min-h-screen w-full bg-white text-black flex flex-col">
      {/* Top bar */}
      <header className="flex justify-end items-center px-5 pt-5">
        <button
          onClick={() => setShowAbout(true)}
          className="text-sm tracking-wide text-black/70 hover:text-black transition-colors"
        >
          About
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <button
          onClick={handlePress}
          aria-label="Press the button"
          className="select-none focus:outline-none"
          style={{
            transform: pressed ? "translateY(4px) scale(0.97)" : "translateY(0) scale(1)",
            transition: "transform 120ms ease-out",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <img
            src={redButtonAsset.url}
            alt=""
            width={1024}
            height={1024}
            draggable={false}
            className="w-[68vw] max-w-[340px] h-auto pointer-events-none"
          />
        </button>

        <div
          className="mt-10 min-h-[2.5rem] text-2xl sm:text-3xl text-black/80 text-center font-light tracking-wide"
          aria-live="polite"
        >
          {message}
        </div>
      </main>

      {/* Bottom */}
      <footer className="flex justify-center pb-6">
        <button
          onClick={() => setShowDonate(true)}
          className="text-sm tracking-wide text-black/70 hover:text-black transition-colors"
        >
          Donate
        </button>
      </footer>

      {/* About modal */}
      {showAbout && (
        <Modal onClose={() => setShowAbout(false)}>
          <div className="mx-auto max-w-[560px] px-6 py-10 text-black">
            <h1 className="text-2xl font-medium mb-6">About</h1>
            <div className="space-y-4 text-[15px] leading-relaxed text-black/80">
              <p>This space is the manifesto of our app.</p>
              <p>And here is why we created all of this:</p>
              <p>
                Social networks literally consume our time, and often our energy as well.
                Every day we open them seeking pleasure or a way to kill time — and we leave
                feeling tired, disappointed, and upset. So why do we give away our precious
                time so easily and so pointlessly?
              </p>
              <p>
                This app is for anyone who wants to take a break from social media —
                temporarily or forever. Every time you feel the urge to open a social
                network, come here instead and press the button. Press it as many times as
                you need. You will discover that "nothing happens." And that is honest and
                fair.
              </p>
              <p>This is your social detox. Peace.</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Donate modal */}
      {showDonate && !showCrypto && (
        <Modal onClose={() => setShowDonate(false)}>
          <div className="mx-auto max-w-[460px] px-6 py-10">
            <h2 className="text-xl font-medium mb-4">Support the project</h2>
            <p className="text-[15px] leading-relaxed text-black/80 mb-8">
              If this app helped you spend less time on social media, you can support its
              development.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={payWithStars}
                className="w-full h-12 rounded-full border border-black/15 text-[15px] font-medium hover:bg-black/[0.03] transition-colors"
              >
                Pay with Telegram Stars
              </button>
              <button
                onClick={() => setShowCrypto(true)}
                className="w-full h-12 rounded-full border border-black/15 text-[15px] font-medium hover:bg-black/[0.03] transition-colors"
              >
                Pay with Crypto
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Crypto modal */}
      {showCrypto && (
        <Modal
          onClose={() => {
            setShowCrypto(false);
            setShowDonate(false);
          }}
        >
          <div className="mx-auto max-w-[460px] px-6 py-10">
            <h2 className="text-xl font-medium mb-4">Pay with Crypto</h2>
            <p className="text-[15px] text-black/70 mb-3">Send to this wallet address:</p>
            <div className="rounded-xl border border-black/10 p-3 break-all font-mono text-[13px] text-black/80 mb-3">
              {WALLET_ADDRESS}
            </div>
            <button
              onClick={copyWallet}
              className="w-full h-11 rounded-full border border-black/15 text-[14px] font-medium hover:bg-black/[0.03] transition-colors"
            >
              {copied ? "Copied" : "Copy address"}
            </button>
          </div>
        </Modal>
      )}

      {/* Victory modal */}
      {showVictory && (
        <Modal onClose={() => setShowVictory(false)} dismissable={false}>
          <div className="mx-auto max-w-[420px] px-6 py-12 text-center">
            <h2 className="text-2xl font-medium mb-3">You reached the end.</h2>
            <p className="text-[15px] text-black/70 mb-8">
              Would you like to start over or continue?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={restart}
                className="w-full h-12 rounded-full bg-black text-white text-[15px] font-medium hover:bg-black/90 transition-colors"
              >
                Restart
              </button>
              <button
                onClick={() => setShowVictory(false)}
                className="w-full h-12 rounded-full border border-black/15 text-[15px] font-medium hover:bg-black/[0.03] transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  children,
  onClose,
  dismissable = true,
}: {
  children: React.ReactNode;
  onClose: () => void;
  dismissable?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {dismissable && (
        <button
          onClick={onClose}
          aria-label="Close"
          className="fixed top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/[0.05] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      {children}
    </div>
  );
}
