const fs = require('fs');
const xlsx = require('xlsx');

const readTranslations = (filePath) => {
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
};

const trTranslations = readTranslations('path/to/tr.js');
const enTranslations = readTranslations('path/to/en.js');

const keys = Array.from(
  new Set([...Object.keys(trTranslations), ...Object.keys(enTranslations)])
);

const rows = keys.map((key) => ({
  key,
  tr: trTranslations[key] || '',
  en: enTranslations[key] || '',
}));

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(rows, { header: ['key', 'tr', 'en'] });

xlsx.utils.book_append_sheet(wb, ws, 'Translations');

xlsx.writeFile(wb, 'translations.xlsx');

console.log('Excel file created: translations.xlsx');
