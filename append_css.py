import sys

css = '''
/* ========================================================
   PREMIUM CONTROL RAIL CSS
   ======================================================== */

:root {
  --rail-bg-top: #111214;
  --rail-bg-bottom: #09090b;
  --rail-border: rgba(255, 255, 255, 0.08);
  --rail-border-soft: rgba(255, 255, 255, 0.04);
  --rail-text: rgba(255, 255, 255, 0.92);
  --rail-text-muted: rgba(255, 255, 255, 0.45);
  --rail-gold: #d4a94d;
  --rail-gold-soft: rgba(212, 169, 77, 0.18);
  --rail-gold-line: rgba(212, 169, 77, 0.28);
  --rail-hover: rgba(255, 255, 255, 0.04);
  --rail-active-bg: linear-gradient(180deg, rgba(212,169,77,0.18) 0%, rgba(212,169,77,0.04) 100%);
  --rail-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.top-rail {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 72px;
  padding: 10px 14px;
  border-radius: 20px;
  border: 1px solid var(--rail-border);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%),
    linear-gradient(180deg, var(--rail-bg-top) 0%, var(--rail-bg-bottom) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.04),
    inset 0 -1px 0 rgba(212,169,77,0.06),
    var(--rail-shadow);
  overflow: hidden;
  isolation: isolate;
}

.top-rail::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.01) 20%,
    rgba(212,169,77,0.04) 50%,
    rgba(255,255,255,0.01) 80%,
    transparent 100%
  );
  transform: translateX(-120%);
  animation: railSheen 12s linear infinite;
  filter: blur(12px);
  opacity: 0.6;
}

.top-rail-group {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
}

.top-rail-left,
.top-rail-center,
.top-rail-right {
  display: flex;
  align-items: center;
}

.top-rail-divider {
  width: 1px;
  height: 34px;
  margin: 0 4px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(255,255,255,0.06) 20%,
    var(--rail-gold-line) 50%,
    rgba(255,255,255,0.06) 80%,
    transparent 100%
  );
  flex-shrink: 0;
}

.rail-segment {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 14px;
  border: 1px solid var(--rail-border-soft);
  background: rgba(255, 255, 255, 0.02);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
}

.rail-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 20px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--rail-text-muted);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
  transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  user-select: none;
}

.rail-btn:hover:not(.active) {
  background: var(--rail-hover);
  color: var(--rail-text);
}

.rail-btn:active {
  transform: translateY(1px);
}

.rail-btn.active {
  color: #fff;
  background: var(--rail-active-bg);
  border-color: rgba(212, 169, 77, 0.28);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.05),
    0 0 0 1px rgba(212,169,77,0.06),
    0 0 24px rgba(212,169,77,0.08);
}

.rail-btn.active::after {
  content: "";
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 0px; 
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: linear-gradient(
    90deg,
    rgba(212,169,77,0.1),
    rgba(212,169,77,1),
    rgba(212,169,77,0.1)
  );
  box-shadow: 0 -2px 10px rgba(212,169,77,0.5);
}

.rail-icon-btn {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--rail-border-soft);
  background: rgba(255,255,255,0.015);
  color: var(--rail-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 180ms ease;
  user-select: none;
}

.rail-icon-btn:hover {
  background: rgba(255,255,255,0.05);
  color: var(--rail-text);
  border-color: rgba(255,255,255,0.12);
}

.rail-icon-btn:active {
  transform: scale(0.96);
}

.rail-icon-btn.gold {
  border-color: rgba(212,169,77,0.22);
  color: #f0d28c;
  background: rgba(212,169,77,0.04);
  box-shadow: 0 0 14px rgba(212,169,77,0.08);
}

.staff-selector {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 44px;
  padding: 0 24px;
  border-radius: 14px;
  border: 1px solid rgba(212,169,77,0.24);
  background: linear-gradient(180deg, rgba(212,169,77,0.12) 0%, rgba(212,169,77,0.03) 100%);
  color: #f3dfab;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.04),
    0 0 18px rgba(212,169,77,0.06);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  overflow: hidden;
  transition: all 200ms ease;
}

.staff-selector:active {
  transform: scale(0.98);
}

.staff-selector::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(255,255,255,0.03) 35%,
    rgba(255,255,255,0.15) 50%,
    transparent 70%
  );
  transform: translateX(-140%);
  animation: selectorSweep 7s ease-in-out infinite;
  animation-delay: 2s;
}

.new-action-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 20px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
  color: var(--rail-text);
  font-size: 14px;
  font-weight: 600;
  transition: all 180ms ease;
  user-select: none;
}

.new-action-btn:hover {
  border-color: rgba(212,169,77,0.3);
  box-shadow: 0 0 18px rgba(212,169,77,0.07);
  color: #fff;
  transform: translateY(-1px);
}

.new-action-btn:active {
  transform: translateY(1px);
}

@keyframes railSheen {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(140%); }
}

@keyframes selectorSweep {
  0%, 70%, 100% { transform: translateX(-140%); opacity: 0; }
  78% { opacity: 1; }
  90% { transform: translateX(140%); opacity: 1; }
}
'''

with open('src/app/globals.css', 'a', encoding='utf-8') as f:
    f.write(css)

print("CSS appended to globals.css")
