const TOAST_DURATION_MS = 3000;

export class Toast {
  private readonly container: HTMLElement;

  constructor() {
    this.container = document.getElementById('toast-container')!;
  }

  show(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    this.container.appendChild(el);
    setTimeout(() => el.remove(), TOAST_DURATION_MS);
  }
}
