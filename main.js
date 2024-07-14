/* 
 DevSnap
  A simple Electron app that takes screenshots of all displays at a set interval.
  The screenshots are saved in a folder named after the date they were taken.
  Within that folder, there is a subfolder for each display, with the screenshots
  named after the time they were taken.
  
  The app runs in the system tray, and the user can set the interval at which
  screenshots are taken by right clicking.

  Author: David Weaver
  WEAVER AUDIO LLC

  License included in LICENSE file : GPU General Public License
*/

const { app, BrowserWindow, screen, Tray, Menu } = require('electron');
const path = require('path');
const screenshot = require('screenshot-desktop');
const schedule = require('node-schedule');
const fs = require('fs-extra');
const screenshotDesktop = require('screenshot-desktop');

let shell = require('electron').shell;
let mainWindow;
let tray;
let scheduledJob;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, 
    webPreferences: {
      nodeIntegration: true,
    },
    icon: path.join(__dirname, 'icon.png') 
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  tray = new Tray(path.join(__dirname, 'icon.png')); 
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Screenshot Interval',
      submenu: [
        { label: '60 times a second', click: () => scheduleScreenshots('*/0.016 * * * * *') },
        { label: '30 times a second', click: () => scheduleScreenshots('*/0.033 * * * * *') },
        { label: '1 Second', click: () => scheduleScreenshots('* * * * * *') },
        { label: '5 seconds', click: () => scheduleScreenshots('*/5 * * * * *') },
        { label: '10 seconds', click: () => scheduleScreenshots('*/10 * * * * *') },
        { label: '30 seconds', click: () => scheduleScreenshots('*/30 * * * * *') },
        { label: 'Minute', click: () => scheduleScreenshots('* * * * *') },
        { label: '5 Minutes', click: () => scheduleScreenshots('*/5 * * * *') },
        { label: '30 Minutes', click: () => scheduleScreenshots('*/30 * * * *') },
        { label: '1 Hour', click: () => scheduleScreenshots('0 * * * *') },
      ],
    },
    { label: "Open Today's Folder", click: () => { openPathAtFolder(path.join(__dirname, `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`)); } },
    { label: "Empty Today's Folder", click: () => { fs.emptyDirSync(path.join(__dirname, `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`)); } },
    { label: 'Quit', click: () => { app.quit(); } }
  ]);
  tray.setToolTip('DevShot');
  tray.setContextMenu(contextMenu);
}

function openPathAtFolder(path) {
  shell.openPath(path);
}


function scheduleScreenshots(cronTime) {
  if (scheduledJob) {
    scheduledJob.cancel();
  }
  scheduledJob = schedule.scheduleJob(cronTime, takeScreenshot);
}

app.on('ready', () => {
  createWindow();

  if (!tray) {
    tray = new Tray(path.join(__dirname, 'icon.png'));
    tray.setToolTip('DevShot');
    setTrayMenu();
  }
  // Default screenshot interval
  scheduleScreenshots('* * * * *'); // Once a minute
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
let screenshotID = 0;


async function takeScreenshot() {
  //Folder for today.
  const today = new Date();
  const folderName = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const savePath = path.join(__dirname, folderName);
  fs.ensureDirSync(savePath);

  //Make a folder within the today folder for each display
  const displays = screen.getAllDisplays();
  const subDirectoryNames = displays.map((display) => `display-${display.id}`);
  subDirectoryNames.forEach((subDirName) => {
    const subDirPath = path.join(savePath, subDirName);
    fs.ensureDirSync(subDirPath);
  });
  
  //Take a screenshot of each display, putting them in their own subfolder
  screenshot.all().then((images) => {
    const displays = screen.getAllDisplays();
    
    images.forEach((img, i) => {
      const display = displays[i];
      const fileName = `${screenshotID}-${display.id}.png`;
      //Save within the Today/Display folder for this display
      const filePath = path.join(savePath, `display-${display.id}`, fileName);
      fs.writeFileSync(filePath, img);
    });
});  
  screenshotID++;
}

// Schedule the screenshot to be taken every minute
schedule.scheduleJob('*/5 * * * *', takeScreenshot);
