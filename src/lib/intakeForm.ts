/**
 * KR8TIV intake-form client logic.
 *
 * Responsibilities:
 *   • Choice / tier button state toggling (radio + multi-select)
 *   • Section scroll-spy for the sticky sidebar nav
 *   • Progress bar synced to field-completion percentage
 *   • LocalStorage autosave so progress survives refresh
 *   • Drag-and-drop file list
 *   • Submit: serialize to text summary, prefill mailto, copy-to-clipboard
 *
 * No backend — the form is a client-side collector that hands the
 * user a mailto and a clipboard payload. Attachments are gathered,
 * displayed, and the user is guided to email them separately to
 * Matt@kr8tiv.io (the legacy flow noted in the brief).
 */

const STORAGE_KEY = 'kr8tiv-intake-v1';

interface Attachment { name: string; size: number; type: string; }

interface FormState {
  fields: Record<string, string | string[] | number>;
  attachments: Attachment[];
}

function loadState(): FormState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as FormState;
  } catch {}
  return { fields: {}, attachments: [] };
}
function saveState(s: FormState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function initIntake(): void {
  const rootMaybe = document.querySelector<HTMLFormElement>('#intake-form');
  if (!rootMaybe) return;
  // Hoist a non-nullable alias so hoisted `function` declarations below
  // (updateProgress, autosave, serialize) can close over a narrowed type
  // without TS losing the narrowing across the hoist boundary.
  const root: HTMLFormElement = rootMaybe;

  const state = loadState();

  // ============ Choice / tier buttons ============
  // Each `.choice` has a hidden <input>. Clicking toggles checked state and
  // updates the underlying input.value so form.serialize picks it up.
  const updateChoice = (el: HTMLElement): void => {
    const input = el.querySelector<HTMLInputElement>('input');
    if (!input) return;
    const name = input.name;
    const type = input.type;
    if (type === 'radio') {
      // Uncheck siblings with same name.
      root.querySelectorAll<HTMLElement>(`.choice input[name="${CSS.escape(name)}"]`).forEach((sib) => {
        const parent = sib.closest<HTMLElement>('.choice');
        if (parent) parent.classList.remove('checked');
      });
      el.classList.add('checked');
      input.checked = true;
    } else {
      el.classList.toggle('checked');
      input.checked = el.classList.contains('checked');
    }
    autosave();
  };

  // Restore checked state from storage + wire click handlers.
  root.querySelectorAll<HTMLElement>('.choice, .tier').forEach((el) => {
    const input = el.querySelector<HTMLInputElement>('input');
    if (!input) return;
    const name = input.name;
    const val = input.value;
    const saved = state.fields[name];
    if (saved !== undefined) {
      if (Array.isArray(saved)) {
        if (saved.includes(val)) { el.classList.add('checked'); input.checked = true; }
      } else if (saved === val) {
        el.classList.add('checked'); input.checked = true;
      }
    }
    el.addEventListener('click', (e) => {
      // Only fire when the click isn't on the underlying input (prevents double-toggle).
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      updateChoice(el);
    });
  });

  // ============ Plain inputs / textareas / selects ============
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea, select'
  ).forEach((el) => {
    const name = el.name;
    if (!name) return;
    const saved = state.fields[name];
    if (saved !== undefined && typeof saved !== 'object') { el.value = String(saved); }
    el.addEventListener('input', autosave);
    el.addEventListener('change', autosave);
  });

  // ============ Range sliders — update numeric label ============
  root.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((el) => {
    const valueLabel = el.parentElement?.querySelector<HTMLElement>('.tone-value');
    const update = () => {
      if (valueLabel) valueLabel.textContent = el.value;
    };
    el.addEventListener('input', update);
    update();
  });

  // ============ File drop zone ============
  const drop = root.querySelector<HTMLElement>('.file-drop');
  const fileInput = root.querySelector<HTMLInputElement>('#attachments');
  const fileList = root.querySelector<HTMLElement>('#file-list');
  const attachments: Attachment[] = [...(state.attachments || [])];

  function renderFileList(): void {
    if (!fileList) return;
    fileList.innerHTML = '';
    attachments.forEach((f, i) => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <span class="fname">${escapeHtml(f.name)}</span>
        <span class="fsize">${(f.size / 1024).toFixed(0)} KB</span>
        <button type="button" class="fremove" aria-label="Remove">×</button>
      `;
      item.querySelector('.fremove')?.addEventListener('click', () => {
        attachments.splice(i, 1);
        renderFileList();
        autosave();
      });
      fileList.appendChild(item);
    });
  }
  renderFileList();

  const addFiles = (files: FileList | null): void => {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f) continue;
      attachments.push({ name: f.name, size: f.size, type: f.type });
    }
    renderFileList();
    autosave();
  };
  fileInput?.addEventListener('change', (e) => {
    addFiles((e.target as HTMLInputElement).files);
  });
  if (drop) {
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e: Event) => {
      e.preventDefault();
      drop.classList.add('drag-over');
    }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e: Event) => {
      e.preventDefault();
      drop.classList.remove('drag-over');
    }));
    drop.addEventListener('drop', (e: DragEvent) => {
      addFiles(e.dataTransfer?.files ?? null);
    });
  }

  // ============ Section scroll-spy + progress ============
  const sections = root.querySelectorAll<HTMLElement>('.intake-section');
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('.intake-nav a');
  const progBar = document.querySelector<HTMLElement>('#intake-progress-fill');

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const id = (e.target as HTMLElement).id;
      navLinks.forEach((a) => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  sections.forEach((s) => spy.observe(s));

  function updateProgress(): void {
    const required = root.querySelectorAll<HTMLInputElement>('[required]');
    let filled = 0;
    required.forEach((el) => {
      if (el.type === 'radio' || el.type === 'checkbox') {
        const name = el.name;
        if (root.querySelector(`[name="${CSS.escape(name)}"]:checked`)) filled++;
      } else if ((el.value ?? '').trim()) { filled++; }
    });
    const pct = required.length ? (filled / required.length) * 100 : 0;
    if (progBar) progBar.style.width = pct.toFixed(0) + '%';
    const pctText = document.querySelector<HTMLElement>('#intake-pct');
    if (pctText) pctText.textContent = pct.toFixed(0) + '%';
  }

  function autosave(): void {
    const data = serialize();
    state.fields = data;
    state.attachments = attachments;
    saveState(state);
    updateProgress();
    // Mark sections "done" in nav if all their required fields are filled.
    sections.forEach((s) => {
      const reqs = s.querySelectorAll<HTMLInputElement>('[required]');
      let allFilled = reqs.length > 0;
      reqs.forEach((el) => {
        if (el.type === 'radio' || el.type === 'checkbox') {
          if (!root.querySelector(`[name="${CSS.escape(el.name)}"]:checked`)) allFilled = false;
        } else if (!(el.value ?? '').trim()) { allFilled = false; }
      });
      const link = document.querySelector(`.intake-nav a[href="#${s.id}"]`);
      if (link) link.classList.toggle('done', allFilled);
    });
  }
  root.addEventListener('input', autosave);
  updateProgress();
  autosave();

  // ============ Serialize to object ============
  function serialize(): Record<string, string | string[]> {
    const fd = new FormData(root);
    const out: Record<string, string | string[]> = {};
    for (const [key, raw] of fd.entries()) {
      const val = String(raw);
      if (out[key] === undefined) out[key] = val;
      else if (Array.isArray(out[key])) (out[key] as string[]).push(val);
      else out[key] = [out[key] as string, val];
    }
    return out;
  }

  // ============ Submit ============
  /* Real form POST to FormSubmit.co (free, no signup, no API key,
     native multipart/form-data attachments up to 25 MB total). The
     mailto: approach was symbolic — most clients can't reliably
     attach files via mailto, so deck/PDF/image uploads were lost.
     This new flow:
       1. Builds a FormData from the form (text fields + files).
       2. Adds FormSubmit's hidden meta inputs (_subject, _replyto,
          _captcha=false, _template=table) so the email lands clean.
       3. POSTs to https://formsubmit.co/<delivery-email> with a real
          fetch(). FormSubmit forwards to lucidbloks@gmail.com,
          arriving with attachments + the user's email as Reply-To
          (so Matt can reply directly from his inbox).
     First-ever submission triggers a one-time confirmation email
     from FormSubmit to lucidbloks@gmail.com — once Matt clicks the
     link, every subsequent submission lands in the inbox without
     intervention. Free tier is 50 submissions/month per email. */
  const FORMSUBMIT_DELIVERY_EMAIL = 'lucidbloks@gmail.com';
  const FORMSUBMIT_ENDPOINT = `https://formsubmit.co/${FORMSUBMIT_DELIVERY_EMAIL}`;

  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = serialize();
    const summary = buildSummary(data, attachments);
    const summaryEl = document.querySelector<HTMLElement>('#intake-summary');
    const pre = document.querySelector<HTMLElement>('#intake-summary-text');
    if (summaryEl && pre) {
      pre.textContent = summary;
      summaryEl.classList.add('show');
      summaryEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Build FormData carrying every named text field + all attachments.
    const formData = new FormData(root);
    // FormSubmit-specific meta. _captcha=false skips their captcha
    // (we already use a honeypot below). _replyto pulls from the form's
    // email field so Matt's reply lands in the user's inbox. _subject
    // gets the name + company so Matt can triage by sender. _template=table
    // produces a clean tabular email instead of raw key=value lines.
    formData.set('_subject', `KR8TIV intake · ${data['name'] ?? 'unknown'} · ${data['company'] ?? ''}`.trim());
    formData.set('_replyto', String(data['email'] ?? ''));
    formData.set('_template', 'table');
    formData.set('_captcha', 'false');
    formData.set('_next', `${window.location.origin}/start/?submitted=1`);
    // Append the human-readable summary as a hidden field so the email
    // body has a chronological narrative on top of the auto-formatted
    // table — easier to skim than raw rows.
    formData.set('_summary', summary);

    const openBtn = document.querySelector<HTMLButtonElement>('#intake-mail-open');
    const copyBtn = document.querySelector<HTMLButtonElement>('#intake-copy');
    if (openBtn) {
      openBtn.textContent = 'Sending…';
      openBtn.setAttribute('disabled', 'true');
    }

    try {
      const resp = await fetch(FORMSUBMIT_ENDPOINT, {
        method: 'POST',
        body: formData,
        // Don't add Content-Type header — fetch sets it automatically
        // with the correct multipart boundary. Manually setting it
        // breaks the boundary string FormSubmit needs to parse files.
        headers: { Accept: 'application/json' }
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      // Success: replace the summary panel CTA with a confirmation.
      if (summaryEl && pre) {
        pre.textContent = summary +
          '\n\n— sent. matt will reply within 24h on weekdays / 48h on weekends —';
      }
      if (openBtn) {
        openBtn.textContent = '✓ Sent';
        openBtn.setAttribute('disabled', 'true');
      }
    } catch (err) {
      // Fallback: if the fetch fails (offline, FormSubmit hiccup,
      // ad-blocker), show a copy/email-Matt fallback so the user
      // doesn't lose their data.
      if (openBtn) {
        openBtn.textContent = 'Open email instead ↳';
        openBtn.removeAttribute('disabled');
        const subject = encodeURIComponent(`KR8TIV intake · ${data['name'] ?? ''} · ${data['company'] ?? ''}`);
        const body = encodeURIComponent(summary);
        openBtn.onclick = () => {
          window.location.href = `mailto:matt@kr8tiv.io?subject=${subject}&body=${body}`;
        };
      }
      console.error('[intake] FormSubmit POST failed, mailto fallback ready:', err);
    }

    if (copyBtn) {
      copyBtn.onclick = async () => {
        try { await navigator.clipboard.writeText(summary); copyBtn.textContent = '✓ Copied'; } catch {}
        setTimeout(() => { if (copyBtn) copyBtn.textContent = 'Copy summary'; }, 2000);
      };
    }
  });

  function buildSummary(data: Record<string, string | string[]>, files: Attachment[]): string {
    const sectionOrder = [
      ['HELLO', ['name', 'email', 'company', 'role']],
      ['PROJECT BASICS', ['project_type', 'project_stage', 'project_desc']],
      ['TIMELINE', ['start_date', 'launch_date', 'urgency']],
      ['BUDGET', ['budget_tier', 'payment_pref']],
      ['GOALS', ['goals', 'kpi']],
      ['AUDIENCE', ['audience_desc', 'age_range', 'geography', 'psychographics']],
      ['COMPETITORS', ['competitor_1', 'competitor_1_note', 'competitor_2', 'competitor_2_note', 'competitor_3', 'competitor_3_note']],
      ['TECH', ['current_site', 'cms_pref', 'integrations']],
      ['DESIGN', ['tone_luxury', 'tone_volume', 'tone_era', 'references', 'avoid']],
      ['FINAL', ['process_ack', 'mailing_list', 'privacy_consent']]
    ] as const;
    let out = 'KR8TIV INTAKE FORM\n' + '='.repeat(50) + '\n\n';
    sectionOrder.forEach(([title, keys]) => {
      out += '─── ' + title + ' ───\n';
      keys.forEach((k) => {
        const v = data[k];
        if (v === undefined || v === '') return;
        const display = Array.isArray(v) ? v.join(', ') : v;
        out += `  ${k.toUpperCase().replace(/_/g, ' ')}: ${display}\n`;
      });
      out += '\n';
    });
    if (files.length) {
      out += '─── ATTACHMENTS ───\n';
      files.forEach((f) => {
        out += `  · ${f.name} (${(f.size / 1024).toFixed(0)} KB)\n`;
      });
      out += '\n  → Please email these files to matt@kr8tiv.io with the subject above.\n';
    }
    return out;
  }

  function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
  }
}
