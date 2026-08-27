// Capture form-typed PII on field blur (email, phone, name)
type CaptureEmitter = (event: {
  field_name: string;
  field_type: string;
  value: string;
  page_path: string;
}) => void;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s\-()]{6,20}$/;

function classify(el: HTMLInputElement | HTMLTextAreaElement): string | null {
  const type = (el.getAttribute('type') || '').toLowerCase();
  const name = (el.getAttribute('name') || el.id || '').toLowerCase();
  const auto = (el.getAttribute('autocomplete') || '').toLowerCase();
  const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
  const hay = `${name} ${auto} ${placeholder}`;

  if (type === 'email' || /email|e-mail/.test(hay)) return 'email';
  if (type === 'tel' || /phone|mobile|tel|whatsapp/.test(hay)) return 'phone';
  if (/(^|[^a-z])name([^a-z]|$)|fullname|firstname|lastname/.test(hay)) return 'name';
  return null;
}

export function startFormCapture(emit: CaptureEmitter): () => void {
  const onBlur = (e: FocusEvent) => {
    const t = e.target as HTMLElement;
    if (!t) return;
    if (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') return;
    const el = t as HTMLInputElement | HTMLTextAreaElement;
    const kind = classify(el);
    if (!kind) return;
    const val = (el.value || '').trim();
    if (!val || val.length > 200) return;
    // Format guard
    if (kind === 'email' && !EMAIL_RE.test(val)) return;
    if (kind === 'phone' && !PHONE_RE.test(val)) return;
    if (kind === 'name' && val.length < 2) return;

    emit({
      field_name: (el.getAttribute('name') || el.id || kind).substring(0, 100),
      field_type: kind,
      value: val.substring(0, 200),
      page_path: window.location.pathname,
    });
  };

  document.addEventListener('blur', onBlur, true); // capture phase

  return () => {
    document.removeEventListener('blur', onBlur, true);
  };
}
