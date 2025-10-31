import * as vscode from 'vscode';
import { readUsageLastNDays, formatUSD } from './usage';
import { UsagePanel } from './panel';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function activate(context: vscode.ExtensionContext) {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.command = 'my-cc-usage.showDetails';
  status.tooltip = 'Claude Code usage — click for details';
  status.show();

  const refresh = () => {
    const days = readUsageLastNDays(7);
    const today = days.find(d => d.date === todayKey());
    status.text = today ? `Today: ${formatUSD(today.costUSD)}` : 'Claude: $0.00';
  };

  refresh();
  const timer = setInterval(refresh, 30_000); // 30秒ごと

  context.subscriptions.push(
    status,
    { dispose: () => clearInterval(timer) },
    vscode.commands.registerCommand('my-cc-usage.refresh', refresh),
    vscode.commands.registerCommand('my-cc-usage.showDetails', () => {
      const days = readUsageLastNDays(7);
      UsagePanel.show(context, days);
    })
  );
}

export function deactivate() {}
