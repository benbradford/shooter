import * as vscode from 'vscode';
import { SessionsProvider, SessionItem } from './sessionsProvider';
import { SessionManager } from './sessionManager';
import { TrackersProvider, TrackerItem, openTrackerPanel } from './trackersProvider';

export function activate(context: vscode.ExtensionContext) {
  const manager = new SessionManager(context);
  const provider = new SessionsProvider(manager);

  const tree = vscode.window.createTreeView('dbSessions', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });
  context.subscriptions.push(tree);

  const trackersProvider = new TrackersProvider();
  const trackersTree = vscode.window.createTreeView('dbTrackers', {
    treeDataProvider: trackersProvider,
  });
  context.subscriptions.push(trackersTree);

  context.subscriptions.push(
    vscode.commands.registerCommand('dbSessions.refresh', () => provider.refresh()),
    vscode.commands.registerCommand('dbSessions.create', () => manager.createSession(provider)),
    vscode.commands.registerCommand('dbSessions.open', (item: SessionItem) => {
      if (!item?.session) return;
      manager.openSession(item.session);
    }),
    vscode.commands.registerCommand('dbSessions.rename', (item: SessionItem) => {
      if (!item?.session) return;
      manager.renameSession(item.session, provider);
    }),
    vscode.commands.registerCommand('dbSessions.archive', (item: SessionItem) => {
      if (!item?.session) return;
      manager.archiveSession(item.session, provider);
    }),
    vscode.commands.registerCommand('dbSessions.unarchive', (item: SessionItem) => {
      if (!item?.session) return;
      manager.unarchiveSession(item.session, provider);
    }),
    vscode.commands.registerCommand('dbSessions.kill', (item: SessionItem) => {
      if (!item?.session) return;
      manager.killSession(item.session, provider);
    }),
    vscode.commands.registerCommand('dbSessions.delete', (item: SessionItem) => {
      if (!item?.session) return;
      manager.deleteSession(item.session, provider);
    }),
    vscode.commands.registerCommand('dbSessions.restart', (item: SessionItem) => {
      if (!item?.session) return;
      manager.restartSession(item.session, provider);
    }),
    vscode.commands.registerCommand('dbTrackers.open', (item: TrackerItem) => openTrackerPanel(item)),
  );

  // Auto-refresh every 5 seconds
  const interval = setInterval(() => provider.refresh(), 5000);
  context.subscriptions.push({ dispose: () => clearInterval(interval) });
}

export function deactivate() {}
