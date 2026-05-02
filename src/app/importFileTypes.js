const TEXT_EXTENSIONS = /\.(txt|md|csv|json)$/i;

function isImageImportFile(file) {
  return !!file?.type?.startsWith('image/');
}

export function isPdfImportFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '');
  return type === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
}

export function isTextLikeImportFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '');
  return type.startsWith('text/') || TEXT_EXTENSIONS.test(name);
}

export function classifyUniversalImportFile(file) {
  if (!file) {
    return {
      supported: false,
      source: 'missing',
      error: 'Arquivo não fornecido',
    };
  }

  if (isPdfImportFile(file)) {
    return {
      supported: true,
      source: 'pdf',
      reader: 'pdf',
    };
  }

  if (isImageImportFile(file)) {
    return {
      supported: true,
      source: 'image',
      reader: 'ocr-image',
    };
  }

  if (isTextLikeImportFile(file)) {
    return {
      supported: true,
      source: 'text',
      reader: 'text',
    };
  }

  return {
    supported: false,
    source: 'unknown',
    error: `Formato não suportado: ${file.type || file.name}`,
  };
}
