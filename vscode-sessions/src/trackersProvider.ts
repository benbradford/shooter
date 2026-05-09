import * as vscode from 'vscode';

interface TrackerDef {
  label: string;
  icon: string;
  file: string;
}

const TRACKERS: TrackerDef[] = [
  { label: 'Level Editor', icon: 'map', file: '../editor/' },
  { label: 'Architecture Issues', icon: 'tools', file: 'architecture-issues.html' },
  { label: 'Features', icon: 'sparkle', file: 'feature-tracker.html' },
  { label: 'Bugs', icon: 'bug', file: 'bug-tracker.html' },
  { label: 'Linter Errors', icon: 'warning', file: 'linter-errors.html' },
];

export class TrackerItem extends vscode.TreeItem {
  constructor(public readonly tracker: TrackerDef) {
    super(tracker.label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(tracker.icon);
    this.contextValue = 'tracker';
    this.command = {
      command: 'dbTrackers.open',
      title: 'Open Tracker',
      arguments: [this],
    };
  }
}

export class TrackersProvider implements vscode.TreeDataProvider<TrackerItem> {
  getTreeItem(element: TrackerItem): vscode.TreeItem {
    return element;
  }

  getChildren(): TrackerItem[] {
    return TRACKERS.map(t => new TrackerItem(t));
  }
}

const trackerPanels = new Map<string, vscode.WebviewPanel>();
let gamePanel: vscode.WebviewPanel | undefined;

export function openTrackerPanel(item: TrackerItem): void {
  const key = item.tracker.file;
  const existing = trackerPanels.get(key);
  if (existing) {
    existing.reveal();
    return;
  }

  const url = item.tracker.file.startsWith('../') 
    ? `http://localhost:5173/${item.tracker.file.slice(3)}`
    : `http://localhost:5173/workbench/${item.tracker.file}`;
  const panel = vscode.window.createWebviewPanel(
    'dbTracker',
    item.tracker.label,
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  panel.webview.html = `<!DOCTYPE html>
<html><head><meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; frame-src http://localhost:*;"><style>body,html{margin:0;padding:0;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:none}</style></head>
<body><iframe src="${url}"></iframe>
<script>
const vscode = acquireVsCodeApi();
window.addEventListener('message', e => {
  if (e.data && e.data.type === 'db-open-url') {
    vscode.postMessage(e.data);
  }
});
</script></body></html>`;

  panel.webview.onDidReceiveMessage(msg => {
    if (msg.type === 'db-open-url') {
      openGamePanel(msg.url);
    }
  });

  trackerPanels.set(key, panel);
  panel.onDidDispose(() => trackerPanels.delete(key));
}

function openGamePanel(url: string): void {
  if (gamePanel) {
    gamePanel.webview.html = gameWebviewHtml(url);
    gamePanel.reveal(vscode.ViewColumn.Two);
  } else {
    gamePanel = vscode.window.createWebviewPanel(
      'dbGame',
      'Game',
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    gamePanel.webview.html = gameWebviewHtml(url);
    gamePanel.onDidDispose(() => { gamePanel = undefined; });
  }
}

function gameWebviewHtml(url: string): string {
  return `<!DOCTYPE html>
<html><head><meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; frame-src http://localhost:*;"><style>body,html{margin:0;padding:0;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:70%;border:none;position:absolute;top:15%}</style></head>
<body><iframe src="${url}"></iframe></body></html>`;
}
