# -*- coding: utf-8 -*-
css_addition = """
/* =========================================================
   Two-Tier Header Navigation (AI Tier + Main Tier)
   ========================================================= */
.nav-container-twotier {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
}

.nav-tier-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  padding-bottom: 0.45rem;
}

.nav-ai-suite {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.nav-group-label {
  font-size: 0.76rem;
  color: #fbbf24;
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.nav-links-tier {
  display: flex;
  gap: 0.35rem;
  list-style: none;
  align-items: center;
  margin: 0;
  padding: 0;
}

.nav-link-btn {
  text-decoration: none;
  font-weight: 800;
  font-size: 0.8rem;
  padding: 0.32rem 0.7rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.nav-link-btn.highlight-sky {
  background: linear-gradient(135deg, #0284c7, #38bdf8);
  color: #ffffff;
}

.nav-link-btn.highlight-amber {
  background: linear-gradient(135deg, #d97706, #f59e0b);
  color: #0f172a;
}

.nav-link-btn.highlight-emerald {
  background: linear-gradient(135deg, #059669, #10b981);
  color: #ffffff;
}

.nav-link-btn.highlight-purple {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.nav-link-btn:hover {
  opacity: 0.92;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.nav-tier-bottom {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.nav-main-links {
  display: flex;
  gap: 0.3rem;
  align-items: center;
}

.nav-main-links .nav-link {
  font-size: 0.82rem;
  padding: 0.3rem 0.6rem;
}

.nav-main-links .carte-btn {
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid #f59e0b;
  color: #fbbf24;
  font-weight: 800;
}

.nav-main-links .carte-btn:hover {
  background: #f59e0b;
  color: #0f172a;
}

/* Responsive adjustments for header */
@media (max-width: 1080px) {
  .nav-group-label {
    display: none;
  }
}

@media (max-width: 992px) {
  .nav-ai-suite, .nav-tier-bottom {
    display: none;
  }
  .nav-tier-top {
    border-bottom: none;
    padding-bottom: 0;
  }
  .nav-toggle {
    display: flex;
  }
}

/* =========================================================
   Case Studies 20+ Photos Interactive Gallery (#craftsmanship)
   ========================================================= */
.case-selector-bar {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.6rem 0;
  margin-bottom: 1.5rem;
  scrollbar-width: thin;
}

.case-tab-btn {
  background: #ffffff;
  border: 2px solid #cbd5e1;
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 700;
  font-size: 0.88rem;
  color: #334155;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 3px;
  text-align: left;
}

.case-tab-btn .case-tab-sub {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
}

.case-tab-btn:hover {
  border-color: #f59e0b;
  background: #fefce8;
}

.case-tab-btn.active {
  background: linear-gradient(135deg, #1b4332, #2d6a4f);
  color: #ffffff;
  border-color: var(--accent-gold);
  box-shadow: 0 4px 12px rgba(27, 67, 50, 0.3);
}

.case-tab-btn.active .case-tab-sub {
  color: #fde68a;
}

.case-gallery-container {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-lg);
  padding: 1.8rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
  margin-bottom: 2.5rem;
}

.case-main-viewer {
  position: relative;
  width: 100%;
  height: 520px;
  background: #0f172a;
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  cursor: pointer;
}

.case-main-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.case-main-viewer:hover .case-main-img {
  transform: scale(1.02);
}

.case-badge-count {
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  color: #fde68a;
  font-size: 0.85rem;
  font-weight: 800;
  padding: 5px 14px;
  border-radius: 20px;
  border: 1px solid rgba(253, 230, 138, 0.4);
  z-index: 5;
}

.case-expand-hint {
  position: absolute;
  top: 14px;
  left: 14px;
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  font-size: 0.78rem;
  padding: 4px 10px;
  border-radius: 6px;
  pointer-events: none;
}

.case-caption-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.2) 80%, transparent);
  color: #ffffff;
  padding: 1.5rem 1.8rem 1rem;
  font-size: 1.05rem;
  font-weight: 700;
}

.case-nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(15, 23, 42, 0.75);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 6;
}

.case-nav-arrow:hover {
  background: #f59e0b;
  color: #0f172a;
}

.case-nav-arrow.prev { left: 14px; }
.case-nav-arrow.next { right: 14px; }

.case-thumbnails-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 2px 14px;
  scrollbar-width: thin;
}

.case-thumb-item {
  flex-shrink: 0;
  width: 95px;
  height: 68px;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  opacity: 0.65;
  transition: all 0.2s ease;
}

.case-thumb-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.case-thumb-item:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.case-thumb-item.active {
  border-color: #d97706;
  opacity: 1;
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.4);
}

.case-story-triad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.2rem;
  margin-top: 1.5rem;
}

.case-story-col {
  background: #f8fafc;
  padding: 1.4rem;
  border-radius: 8px;
  border-top: 4px solid var(--accent-gold);
}

.case-story-col h4 {
  font-size: 1.05rem;
  color: var(--primary-green-dark);
  margin-bottom: 0.6rem;
}

.case-story-col p {
  font-size: 0.92rem;
  color: #475569;
  line-height: 1.8;
  margin: 0;
}

@media (max-width: 768px) {
  .case-main-viewer {
    height: 300px;
  }
  .case-story-triad {
    grid-template-columns: 1fr;
  }
}

/* Lightbox Modal */
.case-lightbox-modal {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.94);
  z-index: 9999;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.case-lightbox-modal.active {
  display: flex;
}

.case-lightbox-content {
  max-width: 92vw;
  max-height: 88vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
}

.case-lightbox-close {
  position: absolute;
  top: 20px;
  right: 25px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: none;
  font-size: 2rem;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
"""

with open("public/css/style.css", "r", encoding="utf-8") as f:
    css = f.read()

# Append to style.css if not already present
if ".nav-container-twotier" not in css:
    with open("public/css/style.css", "a", encoding="utf-8") as f:
        f.write("\n" + css_addition)
    print("Appended two-tier header and gallery CSS to style.css!")
else:
    print("Two-tier header CSS already present.")
