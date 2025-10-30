import * as vscode from 'vscode';
import { DayUsage, formatUSD } from './usage';

export class UsagePanel {
  public static current: UsagePanel | undefined;
  private readonly panel: vscode.WebviewPanel;

  static show(context: vscode.ExtensionContext, days: DayUsage[]) {
    if (UsagePanel.current) {
      UsagePanel.current.update(days);
      UsagePanel.current.panel.reveal();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'my-cc-usage.details',
      'Claude Code Usage — Last 7 Days',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
      }
    );
    UsagePanel.current = new UsagePanel(panel, context);
    UsagePanel.current.update(days);
    panel.onDidDispose(() => (UsagePanel.current = undefined));
  }

  private constructor(panel: vscode.WebviewPanel, private readonly context: vscode.ExtensionContext) {
    this.panel = panel;
  }

  update(days: DayUsage[]) {
    const rows = days
      .map(
        d => `
        <tr>
          <td>${d.date}</td>
          <td style="text-align:right">${d.inputTokens.toLocaleString()}</td>
          <td style="text-align:right">${d.outputTokens.toLocaleString()}</td>
          <td style="text-align:right">${d.cacheCreationTokens.toLocaleString()}</td>
          <td style="text-align:right">${d.cacheReadTokens.toLocaleString()}</td>
          <td style="text-align:right">${formatUSD(d.costUSD)}</td>
        </tr>`
      )
      .join('');

    const cssUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.css')
    );

    this.panel.webview.html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="stylesheet" href="${cssUri}">
          <style>
            body { font-family: var(--vscode-font-family); padding: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border-bottom: 1px solid var(--vscode-editorGroup-border); padding: 6px 8px; }
            th { text-align: left; }
          </style>
        </head>
        <body>
          <h2>Claude Code Usage (Last 7 Days)</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th style="text-align:right">Input</th>
                <th style="text-align:right">Output</th>
                <th style="text-align:right">Cache Create</th>
                <th style="text-align:right">Cache Read</th>
                <th style="text-align:right">Cost</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>`;
  }
}
