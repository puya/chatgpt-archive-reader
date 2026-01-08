const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    // Remove the following line to prevent DevTools from auto-opening
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.handle('open-file', async () => {
    console.log('Received open-file request');
    try {
        const { filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        console.log('Selected file paths:', filePaths);
        if (filePaths && filePaths.length > 0) {
            const content = fs.readFileSync(filePaths[0], 'utf8');
            console.log('File content read successfully');
            return { filePath: filePaths[0], content: JSON.parse(content) };
        }
    } catch (error) {
        console.error('Error in open-file:', error);
        return { error: error.message };
    }
});

ipcMain.handle('save-tags', async (event, { filePath, tags }) => {
    console.log('Received save-tags request');
    try {
        const tagsFilePath = filePath.replace('.json', '_tags.json');
        fs.writeFileSync(tagsFilePath, JSON.stringify(tags));
        console.log('Tags saved successfully');
        return true;
    } catch (error) {
        console.error('Error in save-tags:', error);
        return { error: error.message };
    }
});

ipcMain.handle('load-tags', async (event, filePath) => {
    console.log('Received load-tags request');
    try {
        const tagsFilePath = filePath.replace('.json', '_tags.json');
        if (fs.existsSync(tagsFilePath)) {
            const tagsContent = fs.readFileSync(tagsFilePath, 'utf8');
            console.log('Tags loaded successfully');
            return JSON.parse(tagsContent);
        }
        console.log('No tags file found');
        return {};
    } catch (error) {
        console.error('Error in load-tags:', error);
        return { error: error.message };
    }
});