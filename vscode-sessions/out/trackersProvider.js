"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackersProvider = exports.TrackerItem = void 0;
exports.openTrackerPanel = openTrackerPanel;
const vscode = __importStar(require("vscode"));
const TRACKERS = [
    { label: 'Level Editor', icon: 'map', file: '../editor/' },
    { label: 'Architecture Issues', icon: 'tools', file: 'architecture-issues.html' },
    { label: 'Features', icon: 'sparkle', file: 'feature-tracker.html' },
    { label: 'Bugs', icon: 'bug', file: 'bug-tracker.html' },
    { label: 'Linter Errors', icon: 'warning', file: 'linter-errors.html' },
];
class TrackerItem extends vscode.TreeItem {
    tracker;
    constructor(tracker) {
        super(tracker.label, vscode.TreeItemCollapsibleState.None);
        this.tracker = tracker;
        this.iconPath = new vscode.ThemeIcon(tracker.icon);
        this.contextValue = 'tracker';
        this.command = {
            command: 'dbTrackers.open',
            title: 'Open Tracker',
            arguments: [this],
        };
    }
}
exports.TrackerItem = TrackerItem;
class TrackersProvider {
    getTreeItem(element) {
        return element;
    }
    getChildren() {
        return TRACKERS.map(t => new TrackerItem(t));
    }
}
exports.TrackersProvider = TrackersProvider;
const trackerPanels = new Map();
let gamePanel;
function openTrackerPanel(item) {
    const key = item.tracker.file;
    const existing = trackerPanels.get(key);
    if (existing) {
        existing.reveal();
        return;
    }
    const url = item.tracker.file.startsWith('../')
        ? `http://localhost:5173/${item.tracker.file.slice(3)}`
        : `http://localhost:5173/workbench/${item.tracker.file}`;
    const panel = vscode.window.createWebviewPanel('dbTracker', item.tracker.label, vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
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
function openGamePanel(url) {
    if (gamePanel) {
        gamePanel.webview.html = gameWebviewHtml(url);
        gamePanel.reveal(vscode.ViewColumn.Two);
    }
    else {
        gamePanel = vscode.window.createWebviewPanel('dbGame', 'Game', vscode.ViewColumn.Two, { enableScripts: true, retainContextWhenHidden: true });
        gamePanel.webview.html = gameWebviewHtml(url);
        gamePanel.onDidDispose(() => { gamePanel = undefined; });
    }
}
function gameWebviewHtml(url) {
    return `<!DOCTYPE html>
<html><head><meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; frame-src http://localhost:*;"><style>body,html{margin:0;padding:0;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:none}</style></head>
<body><iframe src="${url}"></iframe></body></html>`;
}
//# sourceMappingURL=trackersProvider.js.map