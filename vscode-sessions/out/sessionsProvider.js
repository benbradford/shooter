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
exports.SessionsProvider = exports.SessionItem = void 0;
const vscode = __importStar(require("vscode"));
class SessionItem extends vscode.TreeItem {
    session;
    constructor(session) {
        super(session.label, vscode.TreeItemCollapsibleState.None);
        this.session = session;
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
        }
        else {
            this.command = {
                command: 'dbSessions.restart',
                title: 'Restart Session',
                arguments: [this],
            };
        }
    }
}
exports.SessionItem = SessionItem;
class CategoryItem extends vscode.TreeItem {
    sessions;
    constructor(label, sessions) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.sessions = sessions;
        this.contextValue = 'category';
    }
}
class SessionsProvider {
    manager;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(manager) {
        this.manager = manager;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (element instanceof CategoryItem) {
            return element.sessions.map(s => new SessionItem(s));
        }
        if (element)
            return [];
        const sessions = this.manager.getSessions();
        const workflows = sessions.filter(s => !s.archived && s.tag);
        const active = sessions.filter(s => !s.archived && !s.tag);
        const archived = sessions.filter(s => s.archived);
        const categories = [];
        if (workflows.length)
            categories.push(new CategoryItem(`Workflows (${workflows.length})`, workflows));
        if (active.length)
            categories.push(new CategoryItem(`Sessions (${active.length})`, active));
        if (archived.length) {
            const cat = new CategoryItem(`Archived (${archived.length})`, archived);
            cat.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            categories.push(cat);
        }
        // If only one category, skip the grouping
        if (categories.length === 1 && categories[0] instanceof CategoryItem) {
            return categories[0].sessions.map(s => new SessionItem(s));
        }
        return categories;
    }
}
exports.SessionsProvider = SessionsProvider;
//# sourceMappingURL=sessionsProvider.js.map