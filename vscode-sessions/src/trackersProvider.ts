import * as vscode from 'vscode';

interface TrackerDef {
  label: string;
  icon: string;
  file: string;
}

const TRACKERS: TrackerDef[] = [
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

export function openTrackerPanel(item: TrackerItem): void {
  const url = `http://localhost:5173/workbench/${item.tracker.file}`;
  const panel = vscode.window.createWebviewPanel(
    'dbTracker',
    item.tracker.label,
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  panel.webview.html = `<!DOCTYPE html>
<html><head><style>body,html{margin:0;padding:0;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:none}</style></head>
<body><iframe src="${url}"></iframe></body></html>`;
}
