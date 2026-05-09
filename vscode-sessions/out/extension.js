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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const sessionsProvider_1 = require("./sessionsProvider");
const sessionManager_1 = require("./sessionManager");
const trackersProvider_1 = require("./trackersProvider");
function activate(context) {
    const manager = new sessionManager_1.SessionManager(context);
    const provider = new sessionsProvider_1.SessionsProvider(manager);
    const tree = vscode.window.createTreeView('dbSessions', {
        treeDataProvider: provider,
        showCollapseAll: true,
    });
    context.subscriptions.push(tree);
    const trackersProvider = new trackersProvider_1.TrackersProvider();
    const trackersTree = vscode.window.createTreeView('dbTrackers', {
        treeDataProvider: trackersProvider,
    });
    context.subscriptions.push(trackersTree);
    context.subscriptions.push(vscode.commands.registerCommand('dbSessions.refresh', () => provider.refresh()), vscode.commands.registerCommand('dbSessions.create', () => manager.createSession(provider)), vscode.commands.registerCommand('dbSessions.open', (item) => {
        if (!item?.session)
            return;
        manager.openSession(item.session);
    }), vscode.commands.registerCommand('dbSessions.rename', (item) => {
        if (!item?.session)
            return;
        manager.renameSession(item.session, provider);
    }), vscode.commands.registerCommand('dbSessions.archive', (item) => {
        if (!item?.session)
            return;
        manager.archiveSession(item.session, provider);
    }), vscode.commands.registerCommand('dbSessions.unarchive', (item) => {
        if (!item?.session)
            return;
        manager.unarchiveSession(item.session, provider);
    }), vscode.commands.registerCommand('dbSessions.kill', (item) => {
        if (!item?.session)
            return;
        manager.killSession(item.session, provider);
    }), vscode.commands.registerCommand('dbSessions.delete', (item) => {
        if (!item?.session)
            return;
        manager.deleteSession(item.session, provider);
    }), vscode.commands.registerCommand('dbSessions.restart', (item) => {
        if (!item?.session)
            return;
        manager.restartSession(item.session, provider);
    }), vscode.commands.registerCommand('dbTrackers.open', (item) => (0, trackersProvider_1.openTrackerPanel)(item)));
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => provider.refresh(), 5000);
    context.subscriptions.push({ dispose: () => clearInterval(interval) });
}
function deactivate() { }
//# sourceMappingURL=extension.js.map