const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  } else {
    return null;
  }
});

ipcMain.handle('create-excel', async (event, { trFilePath, enFilePath }) => {
  try {
    const trTranslations = readTranslations(trFilePath);
    const enTranslations = readTranslations(enFilePath);

    const keys = Array.from(
      new Set([...Object.keys(trTranslations), ...Object.keys(enTranslations)])
    );

    const rows = keys.map((key) => ({
      key,
      tr: trTranslations[key] || '',
      en: enTranslations[key] || '',
    }));

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Translations Excel File',
      defaultPath: path.join(app.getPath('documents'), 'translations.xlsx'),
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (canceled) {
      throw new Error('File save operation was canceled');
    }

    const excelFilePath = filePath;
    await createExcelFile(excelFilePath, rows);
  } catch (err) {
    console.error('Error creating Excel file:', err);
    throw err;
  }
});

ipcMain.handle('import-excel', async (event, { oldFilePath, newFilePath }) => {
  try {
    const oldTranslations = readTranslationsFromExcel(oldFilePath);
    const newTranslations = readTranslationsFromExcel(newFilePath);

    const generatedTranslations = { ...newTranslations };

    Object.keys(oldTranslations).forEach((key) => {
      if (!generatedTranslations[key]) {
        generatedTranslations[key] = {
          tr: oldTranslations[key].tr || '',
          en: oldTranslations[key].en || '',
        };
      } else {
        generatedTranslations[key] = {
          tr: newTranslations[key].tr || '',
          en: newTranslations[key].en || '',
        };
      }
    });

    const rows = Object.keys(generatedTranslations).map((key) => ({
      key,
      tr: generatedTranslations[key].tr,
      en: generatedTranslations[key].en,
    }));

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Exported Translations',
      defaultPath: path.join(
        app.getPath('documents'),
        'exported_translations.xlsx'
      ),
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (canceled) {
      throw new Error('File save operation was canceled');
    }

    const exportedFilePath = filePath;

    await createImportExcelFile(exportedFilePath, rows);
    const trFilePath = path.join(app.getPath('documents'), 'tr.js');
    const enFilePath = path.join(app.getPath('documents'), 'en.js');

    await createNestedFiles(exportedFilePath, trFilePath, enFilePath);
  } catch (err) {
    console.error('Error creating Export Excel file:', err);
    throw err;
  }
});

ipcMain.handle('export-excel', async () => {
  try {
    const trFilePath = path.join(app.getPath('documents'), 'tr.js');
    const enFilePath = path.join(app.getPath('documents'), 'en.js');

    const excelFilePath = path.join(
      app.getPath('documents'),
      'exported_translations.xlsx'
    );

    await createExcelFile(excelFilePath, trFilePath, enFilePath);
  } catch (err) {
    console.error('Error exporting Excel file:', err);
    throw err;
  }
});

function readTranslations(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const translations = {};

  const extractTranslations = (obj, prefix = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        extractTranslations(value, fullKey);
      } else {
        translations[fullKey] = value;
      }
    });
  };

  const matches = fileContent.match(/export\s+default\s+({[\s\S]+?});/);
  if (matches) {
    const translationObject = eval(`(${matches[1]})`);
    extractTranslations(translationObject);
  }

  return translations;
}

function readTranslationsFromExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const translations = {};
  const rows = xlsx.utils.sheet_to_json(worksheet);

  rows.forEach((row) => {
    const key = row.key.trim();
    translations[key] = {
      tr: row.tr || '',
      en: row.en || '',
    };
  });

  return translations;
}

async function createExcelFile(filePath, rows) {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows, {
    header: ['key', 'value'],
  });

  xlsx.utils.book_append_sheet(wb, ws, 'Translations');

  xlsx.writeFile(wb, filePath);
}

async function createImportExcelFile(filePath, rows) {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows, {
    header: ['key', 'tr', 'en'],
  });

  xlsx.utils.book_append_sheet(wb, ws, 'Translations');

  xlsx.writeFile(wb, filePath);
}

async function createNestedFiles(excelFilePath, trFilePath, enFilePath) {
  const translations = readTranslationsFromExcel(excelFilePath);

  const nestedTranslationsTr = {};
  const nestedTranslationsEn = {};

  Object.entries(translations).forEach(([key, value]) => {
    const nestedKeys = key.split('.');
    const mainKey = nestedKeys[0];

    if (nestedKeys.length === 1) {
      nestedTranslationsTr[key] = value.tr;
      nestedTranslationsEn[key] = value.en;
    } else {
      if (!nestedTranslationsTr[mainKey]) {
        nestedTranslationsTr[mainKey] = {};
        nestedTranslationsEn[mainKey] = {};
      }

      if (nestedKeys.length === 2) {
        // labels.marketplace = pazaryeri;
        const nestedKey = nestedKeys.slice(1).join('.');
        nestedTranslationsTr[mainKey][nestedKey] = value.tr;
        nestedTranslationsEn[mainKey][nestedKey] = value.en;
      } else if (nestedKeys.length === 3) {
        // labels.marketplace.products
        let subMainKey = nestedKeys[1];
        if (!nestedTranslationsTr[mainKey][subMainKey]) {
          nestedTranslationsTr[mainKey][subMainKey] = {};
          nestedTranslationsEn[mainKey][subMainKey] = {};
        }
        const nestedKey = nestedKeys.slice(2).join('.');
        nestedTranslationsTr[mainKey][subMainKey][nestedKey] = value.tr;
        nestedTranslationsEn[mainKey][subMainKey][nestedKey] = value.en;
      }
    }
  });

  fs.writeFileSync(
    trFilePath,
    `export default ${JSON.stringify(nestedTranslationsTr, null, 2)};\n`
  );
  fs.writeFileSync(
    enFilePath,
    `export default ${JSON.stringify(nestedTranslationsEn, null, 2)};\n`
  );

  console.log(`Generated tr.js and en.js files.`);
}

async function downloadTranslations(filename, translations) {
  const content = `export default ${JSON.stringify(translations, null, 2)};\n`;
  const downloadPath = path.join(app.getPath('documents'), filename);

  fs.writeFileSync(downloadPath, content);
  console.log(`${filename} downloaded successfully at: ${downloadPath}`);
}
