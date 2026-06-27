const { app, BrowserWindow, tray, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const net = require('net');
const { exec } = require('child_process');

let mainWindow = null;
let appTray = null;
let expressServer = null;

// Configurations File Path
const configPath = path.join(app.getPath('userData'), 'printer-config.json');

// Default Configurations
let config = {
  port: 3001,
  engine: 'native', // 'native' (HTML silent print) | 'escpos' (Raw ESC/POS)
  printerType: 'system', // 'system' (OS Printer Queue) | 'network' (LAN IP)
  systemPrinterName: '', // Selected OS printer name
  networkIp: '192.168.1.100',
  networkPort: 9100,
  paperWidth: '80mm', // '80mm' | '58mm'
  drawerKick: true,
  paperCut: true
};

// Load Configurations
if (fs.existsSync(configPath)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config = { ...config, ...loaded };
  } catch (err) {
    console.error('Error loading config file:', err);
  }
}

// Save Configurations
function saveConfig(newConfig) {
  config = { ...config, ...newConfig };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

// ESC/POS Command Builder (Pure JS)
class EscPosBuilder {
  constructor() {
    this.buffer = [];
  }
  init() {
    this.buffer.push(0x1B, 0x40); // ESC @ (initialize)
    return this;
  }
  text(str) {
    // Add text + newline, fallback encoding to simple ASCII/Latin1
    this.buffer.push(...Buffer.from(str + '\n', 'latin1'));
    return this;
  }
  align(type) {
    // 0 = left, 1 = center, 2 = right
    const val = type === 'center' ? 1 : type === 'right' ? 2 : 0;
    this.buffer.push(0x1B, 0x61, val);
    return this;
  }
  bold(enable) {
    this.buffer.push(0x1B, 0x45, enable ? 1 : 0);
    return this;
  }
  fontSize(width, height) {
    // width: 0-7 (1x to 8x), height: 0-7 (1x to 8x)
    const size = (width << 4) | height;
    this.buffer.push(0x1D, 0x21, size);
    return this;
  }
  feed(lines = 1) {
    this.buffer.push(0x1B, 0x64, lines);
    return this;
  }
  cut() {
    this.buffer.push(0x1D, 0x56, 66, 0); // GS V 66 0 (feed and cut)
    return this;
  }
  drawerKick() {
    this.buffer.push(0x1B, 0x70, 0, 25, 250); // ESC p 0 25 250
    return this;
  }
  line(char = '-', width = 32) {
    this.text(char.repeat(width));
    return this;
  }
  getBuffer() {
    return Buffer.from(this.buffer);
  }
}

// Generate ESC/POS Binary buffer from print payload
function buildReceiptBuffer(data, paperSize) {
  const builder = new EscPosBuilder();
  builder.init();

  const store = data.store || {};
  const tx = data.transaction || {};
  const items = tx.details || tx.items || [];
  
  const charWidth = paperSize === '58mm' ? 32 : 48;

  // Header / Store Info
  builder.align('center');
  builder.bold(true);
  builder.fontSize(1, 1);
  builder.text(store.name || 'TOKO POS');
  builder.fontSize(0, 0);
  builder.bold(false);
  if (store.address) builder.text(store.address);
  if (store.phone) builder.text('Telp: ' + store.phone);
  builder.line('-', charWidth);

  // Transaction Meta
  builder.align('left');
  builder.text(`No. Invoice: ${tx.invoice}`);
  builder.text(`Tanggal    : ${tx.date || new Date().toLocaleString()}`);
  builder.text(`Kasir      : ${tx.cashier || 'Kasir'}`);
  if (tx.customer) {
    builder.text(`Pelanggan  : ${tx.customer}`);
  }
  builder.line('-', charWidth);

  // Items List
  items.forEach(item => {
    // Item name on its own line if long
    const name = item.product?.name || item.name || 'Produk';
    const qty = item.qty || 1;
    const price = Number(item.unit_price || item.price || 0);
    const total = Number(item.price || 0);
    
    builder.text(name);
    
    // Format price line: "  2 x 15,000           30,000"
    const qtyStr = `  ${qty} x ${price.toLocaleString('id-ID')}`;
    const totStr = total.toLocaleString('id-ID');
    
    const spacesCount = charWidth - qtyStr.length - totStr.length;
    const spaces = ' '.repeat(Math.max(1, spacesCount));
    
    builder.text(qtyStr + spaces + totStr);
    if (item.discount_total && Number(item.discount_total) > 0) {
      const discStr = `  (Potongan: -${Number(item.discount_total).toLocaleString('id-ID')})`;
      builder.text(discStr);
    }
  });

  builder.line('-', charWidth);

  // Summary
  const addSummaryLine = (label, value) => {
    const valStr = value.toLocaleString('id-ID');
    const spacesCount = charWidth - label.length - valStr.length;
    const spaces = ' '.repeat(Math.max(1, spacesCount));
    builder.text(label + spaces + valStr);
  };

  addSummaryLine('Subtotal', Number(tx.subtotal || tx.grand_total || 0));
  if (tx.discount && Number(tx.discount) > 0) {
    addSummaryLine('Diskon', -Number(tx.discount));
  }
  if (tx.shipping_cost && Number(tx.shipping_cost) > 0) {
    addSummaryLine('Ongkir', Number(tx.shipping_cost));
  }
  
  builder.bold(true);
  addSummaryLine('GRAND TOTAL', Number(tx.grand_total || 0));
  builder.bold(false);
  builder.line('-', charWidth);

  // Payment Details
  builder.text(`Metode Bayar: ${tx.payment_method || 'Tunai'}`);
  if (tx.payment_method === 'Tunai' || !tx.payment_method || tx.cash) {
    addSummaryLine('Bayar', Number(tx.cash || 0));
    addSummaryLine('Kembali', Number(tx.change || 0));
  }
  
  builder.line('=', charWidth);
  builder.align('center');
  builder.text(store.footer || 'Terima Kasih Atas Kunjungan Anda');
  builder.text('Powered by Antigravity POS');
  builder.feed(4);

  // Drawer Kick & Cut
  if (config.drawerKick) {
    builder.drawerKick();
  }
  if (config.paperCut) {
    builder.cut();
  }

  return builder.getBuffer();
}

// Generate Receipt HTML content for Native print engine
function buildReceiptHtml(data, paperSize) {
  const store = data.store || {};
  const tx = data.transaction || {};
  const items = tx.details || tx.items || [];
  const widthClass = paperSize === '58mm' ? 'width-58' : 'width-80';

  const formatPrice = (val) => Number(val || 0).toLocaleString('id-ID', { minimumFractionDigits: 0 });

  let itemsHtml = '';
  items.forEach(item => {
    const name = item.product?.name || item.name || 'Produk';
    const qty = item.qty || 1;
    const price = Number(item.unit_price || item.price || 0);
    const total = Number(item.price || 0);
    
    itemsHtml += `
      <div class="item">
        <div class="item-name">${name}</div>
        <div class="item-details">
          <span>${qty} x ${formatPrice(price)}</span>
          <span>${formatPrice(total)}</span>
        </div>
        ${item.discount_total && Number(item.discount_total) > 0 ? `
          <div class="item-discount">Potongan: -${formatPrice(item.discount_total)}</div>
        ` : ''}
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          margin: 0;
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
          margin: 0;
          padding: 8px;
          background: #fff;
          -webkit-print-color-adjust: exact;
        }
        .width-58 {
          width: 200px; /* Approximately 58mm width */
        }
        .width-80 {
          width: 280px; /* Approximately 80mm width */
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .header { margin-bottom: 8px; }
        .store-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
        .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
        .double-divider { border-bottom: 1px double #000; margin: 6px 0; }
        .meta-info { margin-bottom: 6px; font-size: 11px; }
        .item { margin-bottom: 6px; }
        .item-details { display: flex; justify-content: space-between; font-size: 11px; }
        .item-discount { font-size: 10px; font-style: italic; color: #333; margin-left: 10px; }
        .summary-row { display: flex; justify-content: space-between; font-size: 11px; }
        .footer { margin-top: 12px; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="${widthClass}">
        <div class="header text-center">
          <div class="store-name">${store.name || 'TOKO POS'}</div>
          ${store.address ? `<div>${store.address}</div>` : ''}
          ${store.phone ? `<div>Telp: ${store.phone}</div>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="meta-info">
          <div>Inv: ${tx.invoice}</div>
          <div>Tgl: ${tx.date || new Date().toLocaleString()}</div>
          <div>Kasir: ${tx.cashier || 'Kasir'}</div>
          ${tx.customer ? `<div>Plg: ${tx.customer}</div>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="items">
          ${itemsHtml}
        </div>
        
        <div class="divider"></div>
        
        <div class="summary">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>${formatPrice(tx.subtotal || tx.grand_total || 0)}</span>
          </div>
          ${tx.discount && Number(tx.discount) > 0 ? `
            <div class="summary-row">
              <span>Diskon</span>
              <span>-${formatPrice(tx.discount)}</span>
            </div>
          ` : ''}
          ${tx.shipping_cost && Number(tx.shipping_cost) > 0 ? `
            <div class="summary-row">
              <span>Ongkir</span>
              <span>${formatPrice(tx.shipping_cost)}</span>
            </div>
          ` : ''}
          <div class="summary-row bold" style="font-size: 13px; margin-top: 2px;">
            <span>GRAND TOTAL</span>
            <span>${formatPrice(tx.grand_total || 0)}</span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="payment-info">
          <div>Metode: ${tx.payment_method || 'Tunai'}</div>
          ${(tx.payment_method === 'Tunai' || !tx.payment_method || tx.cash) ? `
            <div class="summary-row">
              <span>Bayar</span>
              <span>${formatPrice(tx.cash)}</span>
            </div>
            <div class="summary-row">
              <span>Kembali</span>
              <span>${formatPrice(tx.change)}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="double-divider"></div>
        
        <div class="footer text-center">
          <div>${store.footer || 'Terima Kasih Atas Kunjungan Anda'}</div>
          <div style="font-size: 9px; margin-top: 4px; color: #555;">Powered by Antigravity POS</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Print executing logic
async function executePrintJob(data) {
  const paperSize = data.paperWidth || config.paperWidth;

  if (config.engine === 'native') {
    // 1. NATIVE HTML PRINTING
    const printerName = config.systemPrinterName;
    const htmlContent = buildReceiptHtml(data, paperSize);

    // Create background window
    let printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
    printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    return new Promise((resolve, reject) => {
      printWin.webContents.once('did-finish-load', () => {
        const printOptions = {
          silent: true,
          printBackground: true,
          deviceName: printerName,
          margins: { marginType: 'none' }
        };
        printWin.webContents.print(printOptions, (success, errorType) => {
          printWin.destroy();
          if (success) {
            resolve({ success: true, message: 'Printed successfully via Native Spooler' });
          } else {
            reject(new Error(`Native print failed: ${errorType}`));
          }
        });
      });
      printWin.webContents.once('did-fail-load', (err) => {
        printWin.destroy();
        reject(new Error('Failed to load print template window'));
      });
    });

  } else {
    // 2. RAW ESC/POS COMMAND PRINTING
    const buffer = buildReceiptBuffer(data, paperSize);

    if (config.printerType === 'network') {
      // Direct LAN Network Socket Connection
      return new Promise((resolve, reject) => {
        const client = new net.Socket();
        client.setTimeout(5000); // 5 sec timeout

        client.connect(config.networkPort, config.networkIp, () => {
          client.write(buffer, () => {
            client.end();
            resolve({ success: true, message: `Raw ESC/POS sent to LAN printer at ${config.networkIp}:${config.networkPort}` });
          });
        });

        client.on('error', (err) => {
          client.destroy();
          reject(new Error(`Network Printer Connection Error: ${err.message}`));
        });

        client.on('timeout', () => {
          client.destroy();
          reject(new Error('Network Printer Connection Timeout'));
        });
      });

    } else {
      // System raw spooling bypass (OS USB queue)
      // Save buffer to a temp file and send via OS specific raw command
      const tempFilePath = path.join(app.getPath('temp'), `receipt_${Date.now()}.bin`);
      fs.writeFileSync(tempFilePath, buffer);

      return new Promise((resolve, reject) => {
        let command = '';
        if (process.platform === 'win32') {
          // Windows Raw Spooling via copy or PowerShell
          // If printer system name is not empty, send raw print job
          if (!config.systemPrinterName) {
            return reject(new Error('System printer name is not configured for raw USB printing'));
          }
          // Using raw print command
          command = `powershell -Command "Get-Content -Path '${tempFilePath}' -Raw -Encoding Byte | Out-Printer -Name '${config.systemPrinterName}'"`;
        } else {
          // macOS & Linux raw print (CUPS lpr command bypasses standard page formatting with -o raw)
          if (!config.systemPrinterName) {
            return reject(new Error('System printer name is not configured for raw USB printing'));
          }
          command = `lpr -P "${config.systemPrinterName}" -o raw "${tempFilePath}"`;
        }

        exec(command, (error, stdout, stderr) => {
          // Clean up temp file
          try { fs.unlinkSync(tempFilePath); } catch (e) {}

          if (error) {
            reject(new Error(`Raw print command error: ${stderr || error.message}`));
          } else {
            resolve({ success: true, message: `Raw ESC/POS sent to OS printer queue: ${config.systemPrinterName}` });
          }
        });
      });
    }
  }
}

// Start local Express server
function startServer() {
  if (expressServer) return;

  const serverApp = express();
  serverApp.use(cors());
  serverApp.use(bodyParser.json());

  serverApp.get('/status', (req, res) => {
    res.json({
      status: 'online',
      message: 'Antigravity Printer Bridge is Active',
      config
    });
  });

  serverApp.get('/printers', async (req, res) => {
    try {
      // Create a temporary hidden window to query system printers
      let tempWin = new BrowserWindow({ show: false });
      const printersList = await tempWin.webContents.getPrintersAsync();
      tempWin.destroy();
      res.json({ success: true, printers: printersList });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  serverApp.post('/settings', (req, res) => {
    try {
      saveConfig(req.body);
      // If port changed, let the user know they need to restart
      res.json({ success: true, message: 'Settings updated successfully', config });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  serverApp.post('/print', async (req, res) => {
    try {
      const result = await executePrintJob(req.body);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  serverApp.post('/test-print', async (req, res) => {
    try {
      const testData = {
        store: {
          name: 'TEST PRINTER BRIDGE',
          address: 'Jembatan Printer Desktop',
          phone: '0800-TEST-PRINTER',
          footer: 'Bridge Test Selesai!'
        },
        transaction: {
          invoice: 'TRX-TEST-9999',
          date: new Date().toLocaleString(),
          cashier: 'System Test',
          customer: 'Pelanggan Uji Coba',
          details: [
            { name: 'Koneksi Printer Ok', qty: 1, price: 0, total: 0 },
            { name: 'Paper Feed & Cut Ok', qty: 1, price: 0, total: 0 }
          ],
          subtotal: 0,
          grand_total: 0,
          payment_method: 'Uji Coba',
          cash: 0,
          change: 0
        }
      };
      const result = await executePrintJob(testData);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  expressServer = serverApp.listen(config.port, () => {
    console.log(`Printer Bridge API listening on port ${config.port}`);
  });
}

function stopServer() {
  if (expressServer) {
    expressServer.close();
    expressServer = null;
  }
}

// Create Electron Main Window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 700,
    title: 'Antigravity Printer Bridge',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

// Create System Tray Icon
function createTray() {
  // Using a blank image or simple character since we don't have a physical icon.png yet
  // In production, we would have a nice icon.png
  appTray = new tray(path.join(__dirname, 'icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Buka Dashboard',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Uji Cetak (Test Print)',
      click: async () => {
        try {
          mainWindow.webContents.send('test-print-trigger');
        } catch (e) {}
      }
    },
    { type: 'separator' },
    {
      label: 'Restart Server API',
      click: () => {
        stopServer();
        startServer();
      }
    },
    {
      label: 'Keluar',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  appTray.setToolTip('Antigravity POS Printer Bridge');
  appTray.setContextMenu(contextMenu);

  // Double click tray icon to restore window
  appTray.on('double-click', () => {
    mainWindow.show();
  });
}

// Application Lifecycle
app.whenReady().then(() => {
  // Create a placeholder icon.png if it does not exist
  const iconPath = path.join(__dirname, 'icon.png');
  if (!fs.existsSync(iconPath)) {
    // Write a standard tiny transparent 1x1 png or simple placeholder
    const base64Icon = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMklEQVQ4T2PV1dX9z0AEYGJgGBVAMgxpGBVAkkaqg2gY0jBqAMkgpGFUAMkwpGFUAIl0AABF1A1B4zZ/nAAAAABJRU5ErkJggg==';
    fs.writeFileSync(iconPath, Buffer.from(base64Icon, 'base64'));
  }

  createMainWindow();
  createTray();
  startServer();
});

app.on('window-all-closed', () => {
  // Overridden to keep running on tray
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// IPC communication from UI
ipcMain.on('get-config', (event) => {
  event.returnValue = config;
});

ipcMain.on('save-config', (event, newConfig) => {
  saveConfig(newConfig);
  event.returnValue = { success: true, config };
});

ipcMain.on('restart-server', (event) => {
  stopServer();
  startServer();
  event.returnValue = true;
});
