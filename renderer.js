const { ipcRenderer } = require('electron');

const importExportDiv = document.getElementById('import-export');
const importOptionsDiv = document.getElementById('import-options');
const exportOptionsDiv = document.getElementById('export-options');

let trFilePath = null;
let enFilePath = null;
let oldFilePath = null;
let newFilePath = null;

document.getElementById('import').addEventListener('click', () => {
  exportOptionsDiv.style.display = 'none';
  importOptionsDiv.style.display = 'block';
});

document.getElementById('export').addEventListener('click', () => {
  importOptionsDiv.style.display = 'none';
  exportOptionsDiv.style.display = 'block';
});

document.getElementById('select-tr').addEventListener('click', async () => {
  const files = await ipcRenderer.invoke('select-files');
  trFilePath = files;
  document.getElementById('selected-tr-file').textContent = files
    ? files
    : 'No file selected';
});

document.getElementById('select-en').addEventListener('click', async () => {
  const files = await ipcRenderer.invoke('select-files');
  enFilePath = files;
  document.getElementById('selected-en-file').textContent = files
    ? files
    : 'No file selected';
});

document.getElementById('create-excel').addEventListener('click', async () => {
  if (trFilePath && enFilePath) {
    try {
      await ipcRenderer.invoke('create-excel', { trFilePath, enFilePath });
    } catch (err) {
      console.error('Error creating Excel file:', err);
    }
  } else {
    console.error('Please select both Turkish and English files.');
  }
});

document.getElementById('export-excel').addEventListener('click', async () => {
  try {
    await ipcRenderer.invoke('export-excel');
  } catch (err) {
    console.error('Error exporting Excel file:', err);
  }
});

document
  .getElementById('select-old-file')
  .addEventListener('click', async () => {
    const filePath = await ipcRenderer.invoke('select-files');
    if (filePath) {
      oldFilePath = filePath;
      document.getElementById('selected-old-file').textContent = filePath;
    }
  });

document
  .getElementById('select-new-file')
  .addEventListener('click', async () => {
    const filePath = await ipcRenderer.invoke('select-files');
    if (filePath) {
      newFilePath = filePath;
      document.getElementById('selected-new-file').textContent = filePath;
    }
  });

document
  .getElementById('create-import-excel')
  .addEventListener('click', async () => {
    if (oldFilePath && newFilePath) {
      try {
        await ipcRenderer.invoke('import-excel', { oldFilePath, newFilePath });
        console.log('Import Excel file created successfully.');
      } catch (err) {
        console.error('Error creating Import Excel file:', err);
      }
    } else {
      console.error('Please select both old and new files.');
    }
  });
document.getElementById('download-tr').addEventListener('click', async () => {
  try {
    await ipcRenderer.invoke('download-tr');
  } catch (err) {
    console.error('Error downloading tr.js file:', err);
  }
});

document.getElementById('download-en').addEventListener('click', async () => {
  try {
    await ipcRenderer.invoke('download-en');
  } catch (err) {
    console.error('Error downloading en.js file:', err);
  }
});
