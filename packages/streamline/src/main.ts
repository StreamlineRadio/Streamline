import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';
import windowStateKeeper from 'electron-window-state';
import { checkForUpdates } from './update-check';
import { initLogging, log } from './logging';
import { openDb, closeDb } from './db';
import { runMigrations } from './db/migrate';
import { registerAllHandlers } from './ipc/register';
import { setEncoderWindow } from './ipc/handlers/encoder';
import { createAudioPort } from './audio/port';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

const DEV_SERVER_URL = MAIN_WINDOW_VITE_DEV_SERVER_URL;

// eslint-disable-next-line @typescript-eslint/no-require-imports
if (process.platform === 'win32' && require('electron-squirrel-startup')) app.quit();
app.setAppUserModelId('com.squirrel.Streamline.Streamline');
Menu.setApplicationMenu(null);
initLogging();
log.info('Streamline starting', { version: app.getVersion() });

const createWindow = (): BrowserWindow => {
	const windowState = windowStateKeeper({
		defaultWidth: 1280,
		defaultHeight: 800
	});

	const mainWindow = new BrowserWindow({
		x: windowState.x,
		y: windowState.y,
		width: windowState.width,
		height: windowState.height,
		icon: path.join(app.getAppPath(), 'build/icon.png'),
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true
		}
	});

	windowState.manage(mainWindow);

	if (windowState.x === undefined) {
		mainWindow.maximize();
	}

	if (DEV_SERVER_URL) {
		mainWindow.loadURL(DEV_SERVER_URL);
		mainWindow.webContents.openDevTools();
	} else {
		mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
	}

	return mainWindow;
};

app.whenReady().then(async () => {
	openDb();
	runMigrations();
	registerAllHandlers();
	checkForUpdates();
	const win = createWindow();
	setEncoderWindow(win);
	createAudioPort(win);

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('will-quit', () => closeDb());

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});
