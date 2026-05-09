import * as vscode from 'vscode';
import { SessionManager, Session } from './sessionManager';

export class SessionItem extends vscode.TreeItem {
  constructor(public readonly session: Session) {
    super(session.label, vscode.TreeItemCollapsibleState.None);
    const isActive = session.status === 'active';
    this.description = isActive ? '● active' : '○ dead';
    this.iconPath = new vscode.ThemeIcon(isActive ? 'terminal' : 'circle-slash');
    const isWorkflow = !!session.tag;
    this.contextValue = session.archived
      ? 'archived_session'
      : isWorkflow
        ? (isActive ? 'active_workflow' : 'dead_workflow')
        : (isActive ? 'active_session' : 'dead_session');
    this.tooltip = `${session.label}\nStatus: ${session.status}\nCreated: ${new Date(session.createdAt).toLocaleString()}\ntmux: ${session.tmuxSession}`;

    if (isActive) {
      this.command = {
        command: 'dbSessions.open',
        title: 'Open in Terminal',
        arguments: [this],
      };
    } else {
      this.command = {
        command: 'dbSessions.restart',
        title: 'Restart Session',
        arguments: [this],
      };
    }
  }
}

class CategoryItem extends vscode.TreeItem {
  constructor(label: string, public readonly sessions: Session[]) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'category';
  }
}

export class SessionsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly manager: SessionManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (element instanceof CategoryItem) {
      return element.sessions.map(s => new SessionItem(s));
    }
    if (element) return [];

    const sessions = this.manager.getSessions();
    const workflows = sessions.filter(s => !s.archived && s.tag);
    const active = sessions.filter(s => !s.archived && !s.tag);
    const archived = sessions.filter(s => s.archived);

    const categories: vscode.TreeItem[] = [];
    if (workflows.length) categories.push(new CategoryItem(`Workflows (${workflows.length})`, workflows));
    if (active.length) categories.push(new CategoryItem(`Sessions (${active.length})`, active));
    if (archived.length) {
      const cat = new CategoryItem(`Archived (${archived.length})`, archived);
      cat.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
      categories.push(cat);
    }

    // If only one category, skip the grouping
    if (categories.length === 1 && categories[0] instanceof CategoryItem) {
      return (categories[0] as CategoryItem).sessions.map(s => new SessionItem(s));
    }
    return categories;
  }
}
